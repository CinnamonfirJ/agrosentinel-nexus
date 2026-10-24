import os,asyncio,hashlib,io,json,math,secrets,time,uuid
from contextlib import asynccontextmanager
from typing import Annotated
from fastapi import FastAPI,Depends,HTTPException,Request,Response,UploadFile,File,Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse,StreamingResponse
from pydantic import BaseModel,Field
from PIL import Image,UnidentifiedImageError
from . import db,providers,pipeline,storage,infrastructure

REGIONS={
 'dry-corridor':{'label':'Central American Dry Corridor','bounds':[-93,10,-83,18]},
 'east-africa':{'label':'East African Highlands','bounds':[28,-12,43,15]},
 'indo-gangetic':{'label':'Indo-Gangetic Plain','bounds':[72,22,92,33]},
 'mekong':{'label':'Lower Mekong Basin','bounds':[98,8,108,23]},
 'kaduna':{'label':'Kaduna, Nigeria','bounds':[6,9,9,12.5]},
}
REGIONS.update(json.loads(db.setting('custom_regions','{}')))

@asynccontextmanager
async def lifespan(app):
    tasks=[asyncio.create_task(pipeline.worker()),asyncio.create_task(pipeline.scheduler())]
    yield
    for task in tasks:task.cancel()
    await asyncio.gather(*tasks,return_exceptions=True)

app=FastAPI(title='AgroSentinel Nexus',version='1.0.0',lifespan=lifespan)

@app.exception_handler(RequestValidationError)
async def validation_error(request,error):
    from fastapi.responses import JSONResponse
    return JSONResponse({'detail':[{k:v for k,v in item.items() if k in ('loc','msg','type')} for item in error.errors()]},status_code=422)

mutation_lock=asyncio.Lock()

@app.middleware('http')
async def serialize_mutations(request,call_next):
    if request.method in ('POST','PUT','PATCH','DELETE'):
        async with mutation_lock:
            if infrastructure.migrating():
                from fastapi.responses import JSONResponse
                return JSONResponse({'detail':'Neon migration is in progress. Your queued captures remain on this device; retry shortly.'},status_code=503)
            response=await call_next(request)
            if response.status_code<300:pipeline.wake_worker()
            return response
    return await call_next(request)

@app.exception_handler(infrastructure.InfrastructureError)
async def infrastructure_error(request,error):
    from fastapi.responses import JSONResponse
    return JSONResponse({'detail':str(error)},status_code=503)

@app.exception_handler(providers.ProviderError)
async def provider_error(request,error):
    from fastapi.responses import JSONResponse
    return JSONResponse({'detail':str(error)},status_code=503)

def user(request:Request):
    token=request.headers.get('authorization','').removeprefix('Bearer ') or request.cookies.get('agro_session','')
    found=db.one('SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?',(hashlib.sha256(token.encode()).hexdigest(),time.time()))
    if not found:raise HTTPException(401,'Sign in to your workspace.')
    return found

def admin(current=Depends(user)):
    if current['role']!='manager':raise HTTPException(403,'Manager access required.')
    return current

class NeonConnection(BaseModel):
    database_url:str=Field(min_length=20,max_length=4000)
    endpoint:str=Field(min_length=10,max_length=1000)
    access_key:str=Field(min_length=5,max_length=1000)
    secret_key:str=Field(min_length=5,max_length=2000)
    region:str=Field(min_length=3,max_length=100)
    bucket:str=Field(default='agrosentinel-captures',min_length=3,max_length=63)

@app.get('/api/settings/neon')
def neon_status(current=Depends(admin)):
    return infrastructure.status()

@app.post('/api/settings/neon')
async def connect_neon(body:NeonConnection,current=Depends(admin)):
    if not os.environ.get('AGRO_TESTING'):raise HTTPException(403,'Database credentials are configured by the server administrator in .env.')
    from . import neon
    async with pipeline.lock:
        infrastructure.begin_migration()
        task=asyncio.create_task(asyncio.to_thread(neon.migrate,body.model_dump(),True))
        task.add_done_callback(lambda done: None if done.cancelled() else done.exception())
        return await asyncio.shield(task)

def authorized_scan(sid,current):
    scan=db.one('SELECT * FROM scans WHERE id=?',(sid,))
    if not scan:raise HTTPException(404,'Scan not found.')
    if current['role']!='manager' and current['id']!=scan['user_id']:raise HTTPException(403,'This scan belongs to another agronomist.')
    return scan

def serialize(scan):
    return {**{k:v for k,v in scan.items() if k!='image'},'result':json.loads(scan['result']) if scan.get('result') else None,'image_url':'/api/scans/'+scan['id']+'/image'}

def readiness():
    return {'nebius':bool(db.setting('nebius_api_key')),'tavily':bool(db.setting('tavily_api_key')),'vision_model':db.setting('vision_model'),'reasoning_model':db.setting('reasoning_model')}

@app.get('/api/health')
def health():
    services=readiness()
    return {'status':'ok','services':services,'ready':all(services.values()),'infrastructure':infrastructure.status(),'setup_required':not bool(db.one('SELECT id FROM users LIMIT 1')),'time':time.time()}

@app.get('/api/live')
def live():return {'status':'ok'}

class Account(BaseModel):
    email:str=Field(min_length=5,max_length=254)
    password:str=Field(min_length=12,max_length=200)
    name:str=Field(default='Workspace manager',min_length=1,max_length=100)

def auth_response(response,current):
    token=db.session(current['id'])
    response.set_cookie('agro_session',token,max_age=30*86400,httponly=True,samesite='lax')
    return {'token':token,'user':{k:current[k] for k in ('id','email','name','role')}}

@app.post('/api/auth/register')
def register(body:Account,response:Response):
    if '@' not in body.email:raise HTTPException(422,'Enter a valid email address.')
    uid=str(uuid.uuid4())
    digest=db.password_hash(body.password)
    with db.connect() as c:
        db.begin_exclusive(c,'users')
        if c.execute('SELECT id FROM users LIMIT 1').fetchone():raise HTTPException(403,'Workspace already initialized. Ask your manager to add you.')
        c.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(uid,body.email.strip().lower(),body.name,digest,'manager',time.time()))
    return auth_response(response,db.one('SELECT * FROM users WHERE id=?',(uid,)))

attempts={}
@app.post('/api/auth/login')
def login(body:Account,request:Request,response:Response):
    identity=body.email.strip().lower();now=time.time()
    recent=[t for t in attempts.get(identity,[]) if t>now-300]
    if len(recent)>=10:raise HTTPException(429,'Too many sign-in attempts. Wait five minutes.')
    current=db.one('SELECT * FROM users WHERE email=?',(identity,))
    if not current or not db.password_ok(body.password,current['password']):
        attempts[identity]=[*recent,now]
        raise HTTPException(401,'Email or password is incorrect.')
    attempts.pop(identity,None)
    return auth_response(response,current)

@app.get('/api/auth/me')
def me(current=Depends(user)):return current

@app.post('/api/auth/logout')
def logout(request:Request,response:Response,current=Depends(user)):
    token=request.headers.get('authorization','').removeprefix('Bearer ') or request.cookies.get('agro_session','')
    db.execute('DELETE FROM sessions WHERE hash=?',(hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie('agro_session')
    return {'ok':True}

@app.post('/api/auth/pair')
def pair(current=Depends(user)):
    code=secrets.token_urlsafe(24)
    db.execute('INSERT INTO pairing VALUES(?,?,?)',(hashlib.sha256(code.encode()).hexdigest(),current['id'],time.time()+300))
    return {'code':code,'expires_in':300}

class Pairing(BaseModel):code:str
@app.post('/api/auth/redeem')
def redeem(body:Pairing,response:Response):
    key=hashlib.sha256(body.code.encode()).hexdigest()
    with db.connect() as c:
        db.begin_exclusive(c,'pairing')
        found=c.execute('SELECT * FROM pairing WHERE hash=? AND expires>?',(key,time.time())).fetchone()
        if not found:raise HTTPException(401,'Pairing link expired or was already used.')
        c.execute('DELETE FROM pairing WHERE hash=?',(key,))
    return auth_response(response,db.one('SELECT * FROM users WHERE id=?',(found['user_id'],)))

class Services(BaseModel):
    nebius_key:str=Field(default='',max_length=1000)
    tavily_key:str=Field(default='',max_length=1000)
    vision_model:str=Field(default='',max_length=250)
    reasoning_model:str=Field(default='',max_length=250)
    endpoint:str=Field(default='',max_length=200)

@app.get('/api/settings')
def settings(current=Depends(user)):
    return {'services':readiness(),'endpoint':db.setting('nebius_endpoint',providers.NEBIUS),'preferences':json.loads(db.setting('preferences_'+current['id'],'{}')),'wind_threshold':float(db.setting('wind_threshold','20'))}

@app.post('/api/settings/services')
async def services(body:Services,current=Depends(admin)):
    if not os.environ.get('AGRO_TESTING'):raise HTTPException(403,'Service credentials are configured by the server administrator in .env.')
    key=body.nebius_key or db.setting('nebius_api_key')
    if body.endpoint and body.endpoint not in providers.NEBIUS_ENDPOINTS:raise HTTPException(422,'Unsupported Nebius endpoint.')
    catalog=await providers.models(key,body.endpoint or None) if key else []
    available={m['id'] for m in catalog}
    for model in [body.vision_model,body.reasoning_model]:
        if model and model not in available:raise HTTPException(422,'The selected model is not available on this Nebius account.')
    if body.tavily_key:
        await providers.request('POST','https://api.tavily.com/search',headers={'Authorization':'Bearer '+body.tavily_key},json={'query':'agricultural extension plant disease identification','max_results':1})
    for k,v in [('nebius_endpoint',body.endpoint),('nebius_api_key',body.nebius_key),('tavily_api_key',body.tavily_key),('vision_model',body.vision_model),('reasoning_model',body.reasoning_model)]:
        if v:db.set_setting(k,v)
    return {'services':readiness(),'models':catalog}

@app.post('/api/settings/preferences')
def preferences(body:dict,current=Depends(user)):
    clean={k:v for k,v in body.items() if k in ['region','currency','units','data_saver','density']}
    if 'data_saver' in clean:clean['data_saver']=str(clean['data_saver']).lower() in ['true','1','on']
    if 'currency' in clean and clean['currency'] not in ['USD','NGN']:raise HTTPException(422,'Choose USD or NGN.')
    if 'units' in clean and clean['units'] not in ['metric','imperial']:raise HTTPException(422,'Choose metric or imperial units.')
    previous=json.loads(db.setting('preferences_'+current['id'],'{}'))
    db.set_setting('preferences_'+current['id'],json.dumps({**previous,**clean}))
    if current['role']=='manager' and 'wind_threshold' in body:
        value=float(body['wind_threshold'])
        if not 5<=value<=100:raise HTTPException(422,'Wind threshold must be between 5 and 100 km/h.')
        db.set_setting('wind_threshold',str(value))
    return {'ok':True}

@app.get('/api/team')
def team(current=Depends(user)):return db.rows('SELECT id,name,email,role FROM users')

@app.get('/api/regions')
def regions(current=Depends(user)):return [{'id':key,**value} for key,value in REGIONS.items()]

class RegionConfig(BaseModel):
    id:str=Field(pattern=r'^[a-z0-9][a-z0-9-]{1,59}$')
    label:str=Field(min_length=2,max_length=100)
    west:float=Field(ge=-180,le=180)
    south:float=Field(ge=-90,le=90)
    east:float=Field(ge=-180,le=180)
    north:float=Field(ge=-90,le=90)

@app.post('/api/regions')
def save_region(body:RegionConfig,current=Depends(admin)):
    if body.west>=body.east or body.south>=body.north:raise HTTPException(422,'Region bounds must have west < east and south < north.')
    config={'label':body.label,'bounds':[body.west,body.south,body.east,body.north]}
    custom=json.loads(db.setting('custom_regions','{}'));custom[body.id]=config
    db.set_setting('custom_regions',json.dumps(custom));REGIONS[body.id]=config
    return {'id':body.id,**config}

@app.post('/api/team')
def add_team(body:Account,current=Depends(admin)):
    uid=str(uuid.uuid4())
    try:db.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(uid,body.email.strip().lower(),body.name,db.password_hash(body.password),'agronomist',time.time()))
    except db.IntegrityError:raise HTTPException(409,'That email is already registered.')
    return {'id':uid}

@app.post('/api/scan',status_code=202)
async def scan(image:Annotated[UploadFile,File()],crop:Annotated[str,Form(max_length=100)]='Unknown',region:Annotated[str,Form()]='kaduna',note:Annotated[str,Form(max_length=2000)]='',client_id:Annotated[str,Form(max_length=150)]='',lat:Annotated[float|None,Form()]=None,lon:Annotated[float|None,Form()]=None,current=Depends(user)):
    if region not in REGIONS:raise HTTPException(422,'Choose a supported region.')
    if (lat is None)!=(lon is None) or (lat is not None and (not math.isfinite(lat) or not math.isfinite(lon) or not -90<=lat<=90 or not -180<=lon<=180)):raise HTTPException(422,'Invalid coordinates.')
    client_id=client_id or str(uuid.uuid4())
    prior=db.one('SELECT * FROM scans WHERE user_id=? AND client_id=?',(current['id'],client_id))
    if prior:return serialize(prior)
    raw=await image.read(10*1024*1024+1)
    if len(raw)>10*1024*1024:raise HTTPException(413,'Image must be smaller than 10 MB.')
    try:
        picture=Image.open(io.BytesIO(raw))
        if picture.width*picture.height>20000000:raise ValueError()
        picture.load();picture=picture.convert('RGB');picture.thumbnail((1024,1024))
        if min(picture.size)<100:raise ValueError()
    except (UnidentifiedImageError,ValueError,OSError,Image.DecompressionBombError):raise HTTPException(422,'Upload a clear JPEG, PNG or WebP image at least 100 pixels wide and tall.')
    sid=str(uuid.uuid4());filename=sid+'.jpg'
    compressed=io.BytesIO();picture.save(compressed,'JPEG',quality=60)
    await asyncio.to_thread(storage.put,filename,compressed.getvalue())
    ready=all(readiness().values())
    status='queued' if ready else 'awaiting_services'
    db.execute('INSERT INTO scans(id,user_id,client_id,created,updated,region,crop,note,lat,lon,image,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(sid,current['id'],client_id,time.time(),time.time(),region,crop,note,lat,lon,filename,status))
    db.event(sid,'accepted',message='Capture stored durably. '+('Waiting for analysis.' if ready else 'Waiting for required Nebius and Tavily service connections.'))
    return serialize(db.one('SELECT * FROM scans WHERE id=?',(sid,)))

@app.get('/api/scans')
def scans(current=Depends(user)):
    items=db.rows('SELECT * FROM scans ORDER BY created DESC LIMIT 200') if current['role']=='manager' else db.rows('SELECT * FROM scans WHERE user_id=? ORDER BY created DESC LIMIT 200',(current['id'],))
    return [serialize(s) for s in items]

@app.get('/api/scans/{sid}')
def scan_detail(sid:str,current=Depends(user)):
    scan=authorized_scan(sid,current)
    revision=db.one('SELECT id FROM scans WHERE supersedes=? ORDER BY created DESC LIMIT 1',(sid,))
    return {**serialize(scan),'revision_id':revision['id'] if revision else None,'sources':db.rows('SELECT * FROM sources WHERE scan_id=? ORDER BY retrieved',(sid,)),'events':[{**e,'payload':json.loads(e['payload'])} for e in db.rows('SELECT * FROM events WHERE scan_id=? ORDER BY id',(sid,))]}

@app.get('/api/scans/{sid}/image')
def image(sid:str,current=Depends(user)):
    scan=authorized_scan(sid,current)
    return Response(storage.read(scan['image']),media_type='image/jpeg',headers={'Cache-Control':'private, max-age=3600'})

@app.post('/api/scans/{sid}/retry')
def retry(sid:str,current=Depends(user)):
    scan=authorized_scan(sid,current)
    if scan['status']=='invalidated':
        revision=db.one('SELECT id,status FROM scans WHERE supersedes=? ORDER BY created DESC LIMIT 1',(sid,))
        if revision:return {'scan_id':revision['id'],'status':revision['status']}
    if not all(readiness().values()):raise HTTPException(409,'Connect Nebius, Tavily and both models in Settings before analysis can run.')
    if scan['status'] not in ('failed','awaiting_services','invalidated'):raise HTTPException(409,'Only failed, invalidated or waiting scans can be retried.')
    db.execute("DELETE FROM ledger WHERE scan_id=?",(sid,))
    db.execute("UPDATE scans SET status='queued',error=NULL,updated=? WHERE id=?",(time.time(),sid))
    return {'status':'queued'}

@app.delete('/api/scans/{sid}')
def discard(sid:str,current=Depends(user)):
    scan=authorized_scan(sid,current)
    if scan['status'] not in ('failed','awaiting_services'):raise HTTPException(409,'Only unprocessed or failed captures may be discarded.')
    db.execute("UPDATE scans SET status='discarded',updated=? WHERE id=?",(time.time(),sid))
    return {'ok':True}

@app.post('/api/scans/{sid}/economics')
def economics(sid:str,body:dict,current=Depends(user)):
    scan=authorized_scan(sid,current)
    if scan['status']!='complete':raise HTTPException(409,'A completed plan is required.')
    try:default=float(body['default_cost']);alternative=float(body['plan_cost'])
    except (ValueError,KeyError,TypeError):raise HTTPException(422,'Enter both treatment costs.')
    if not all(math.isfinite(v) and 0<=v<=1e9 for v in [default,alternative]):raise HTTPException(422,'Costs must be non-negative finite numbers.')
    currency=body.get('currency','USD')
    if currency not in ['USD','NGN']:raise HTTPException(422,'Choose USD or NGN.')
    result=json.loads(scan['result']);result['economics']={'default_cost':default,'plan_cost':alternative,'saving':default-alternative,'currency':currency,'method':'User-entered cost comparison; estimate only','entered_by':current['id'],'created':time.time()}
    db.execute('UPDATE scans SET result=?,updated=? WHERE id=?',(json.dumps(result),time.time(),sid))
    db.execute("DELETE FROM ledger WHERE scan_id=? AND type='Economics'",(sid,))
    db.execute('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),sid,time.time(),'Economics','Treatment cost comparison','User-entered costs',result['verdict'],default-alternative,'[]',currency))
    return result['economics']

@app.get('/api/region-map')
def region_map(region:str='kaduna',period:str='24h',current=Depends(admin)):
    if region not in REGIONS:raise HTTPException(422,'Unknown region.')
    hours={'24h':24,'7d':168,'Season':24*180}.get(period,24)
    records=db.rows("SELECT * FROM scans WHERE region=? AND created>? AND status!='discarded' ORDER BY created DESC",(region,time.time()-hours*3600))
    groups={}
    for scan in records:
        if not scan['result'] or scan['lat'] is None or scan.get('supersedes'):continue
        plan=json.loads(scan['result']);d=plan['diagnosis']
        if not d['is_leaf'] or d['confidence']<.6:continue
        # Approximately 10 km cells; only centroid/cell is exposed on the regional surface.
        key=f'{round(scan["lat"],1)}:{round(scan["lon"],1)}:{d["disease"]}'
        groups.setdefault(key,[]).append(scan)
    clusters=[]
    for key,members in groups.items():
        sample=members[0];plan=json.loads(sample['result']);lat=sum(s['lat'] for s in members)/len(members);lon=sum(s['lon'] for s in members)/len(members)
        bounds=REGIONS[region]['bounds'];x=max(2,min(98,(lon-bounds[0])/(bounds[2]-bounds[0])*100));y=max(2,min(98,100-(lat-bounds[1])/(bounds[3]-bounds[1])*100))
        clusters.append({'id':int(hashlib.sha256(key.encode()).hexdigest()[:7],16),'key':key,'name':f'{lat:.1f}°, {lon:.1f}°','country':REGIONS[region]['label'],'disease':plan['diagnosis']['disease'],'crop':plan['diagnosis']['crop'],'count':len(members),'lat':round(lat,1),'lon':round(lon,1),'x':x,'y':y,'level':min(4,1+len(members)//3),'scan_ids':[s['id'] for s in members],'verdict':plan['verdict']})
    ledger=db.rows('SELECT l.* FROM ledger l JOIN scans s ON s.id=l.scan_id WHERE s.region=? AND l.created>? ORDER BY l.created DESC',(region,time.time()-hours*3600))
    totals={currency:sum(l['saving'] or 0 for l in ledger if l['currency']==currency) for currency in ['USD','NGN']}
    completed=[json.loads(s['result']) for s in records if s['result'] and not s.get('supersedes')]
    return {'region':region,'bounds':REGIONS[region]['bounds'],'updated':time.time(),'clusters':clusters,'scans':[serialize(s) for s in records[:100]],'scan_total':len(records),'ledger':[{**l,'source_ids':json.loads(l['source_ids'])} for l in ledger],'kpis':{'detections':sum(bool(p['diagnosis']['is_leaf']) and p['diagnosis']['confidence']>=.6 for p in completed),'clusters':len(clusters),'prevented':sum(p.get('spray_deferred',False) for p in completed),'savings':totals,'checks':len(ledger)},'assignments':db.rows('SELECT * FROM assignments WHERE region=? ORDER BY created DESC',(region,))}

@app.get('/api/ledger')
def ledger(region:str='kaduna',current=Depends(admin)):
    return [{**r,'source_ids':json.loads(r['source_ids'])} for r in db.rows('SELECT l.* FROM ledger l JOIN scans s ON s.id=l.scan_id WHERE s.region=? ORDER BY l.created DESC',(region,))]

@app.get('/api/sources/{source_id}')
def source(source_id:str,current=Depends(user)):
    row=db.one('SELECT * FROM sources WHERE id=?',(source_id,))
    if not row:raise HTTPException(404,'Source not found.')
    authorized_scan(row['scan_id'],current)
    return row

@app.get('/api/market')
def market(region:str='kaduna',current=Depends(user)):
    sources=db.rows("SELECT sources.* FROM sources JOIN scans ON scans.id=sources.scan_id WHERE scans.region=? AND sources.kind IN ('Price','Availability') ORDER BY retrieved DESC LIMIT 100",(region,))
    quotes=[]
    for scan in db.rows("SELECT id,result,updated FROM scans WHERE region=? AND status='complete' ORDER BY updated DESC",(region,)):
        result=json.loads(scan['result'])
        for quote in result.get('market_quotes',[]):quotes.append({**quote,'scan_id':scan['id'],'model':result['model'],'retrieved':scan['updated']})
    groups={}
    for q in quotes:
        key=(q['item'].lower().strip(),q['currency'],q['unit'].lower().strip(),q['kind'])
        groups.setdefault(key,[]).append(q)
    conflicts=[]
    for key,group in groups.items():
        if len({q['amount'] for q in group})>1:
            pick=min(group,key=lambda q:q['amount']) if key[3]=='Price' else max(group,key=lambda q:q['amount'])
            conflicts.append({'item':key[0],'currency':key[1],'unit':key[2],'quotes':group,'conservative':pick,'method':'Lower sale price for conservative revenue planning' if key[3]=='Price' else 'Higher input price for conservative cost planning'})
    return {'sources':sources,'quotes':quotes,'conflicts':conflicts}

@app.post('/api/market/refresh')
async def refresh_market(body:dict,current=Depends(user)):
    # A captured scan anchors evidence ownership and audit provenance.
    sid=body.get('scan_id');scan=authorized_scan(sid,current)
    if not db.setting('tavily_api_key'):raise HTTPException(409,'Connect Tavily to refresh market evidence.')
    sources=await providers.tavily(f'{scan["crop"]} current market price suppliers {scan["region"]} {time.strftime("%Y-%m-%d")}', 'Price')
    for s in sources:db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)',(s['id'],sid,s['kind'],s['query'],s['url'],s['title'],s['content'],s['retrieved'],s['provider']))
    return sources

@app.get('/api/activity')
def activity(current=Depends(admin)):
    return [{**r,'payload':json.loads(r['payload'])} for r in db.rows('SELECT * FROM events ORDER BY id DESC LIMIT 200')]

class Assignment(BaseModel):
    region:str
    cluster_key:str=Field(max_length=500)
    assignee:str
    note:str=Field(default='',max_length=2000)

@app.post('/api/assignments')
async def assign(body:Assignment,current=Depends(admin)):
    if body.region not in REGIONS:raise HTTPException(422,'Unknown region.')
    person=db.one('SELECT id,name FROM users WHERE id=?',(body.assignee,))
    if not person:raise HTTPException(422,'Select a registered team member.')
    aid=str(uuid.uuid4());db.execute('INSERT INTO assignments VALUES(?,?,?,?,?,?,?,?)',(aid,body.region,body.cluster_key,body.assignee,body.note,'assigned',time.time(),current['id']))
    await pipeline.notify(person['id'],'Field inspection assigned',body.note or 'Review the assigned cluster in your workspace.')
    return {'id':aid,'status':'assigned'}

@app.get('/api/assignments')
def my_assignments(current=Depends(user)):
    return db.rows('SELECT a.*,u.name assignee_name FROM assignments a JOIN users u ON u.id=a.assignee WHERE a.assignee=? ORDER BY a.created DESC LIMIT 100',(current['id'],))

class AssignmentProgress(BaseModel):status:str=Field(pattern=r'^(accepted|completed)$')

@app.post('/api/assignments/{aid}/status')
def assignment_progress(aid:str,body:AssignmentProgress,current=Depends(user)):
    assignment=db.one('SELECT * FROM assignments WHERE id=?',(aid,))
    if not assignment:raise HTTPException(404,'Assignment not found.')
    if assignment['assignee']!=current['id'] and current['role']!='manager':raise HTTPException(403,'This assignment belongs to another agronomist.')
    db.execute('UPDATE assignments SET status=? WHERE id=?',(body.status,aid))
    return {'id':aid,'status':body.status}

@app.get('/api/alerts')
def alerts(current=Depends(user)):
    return db.rows('SELECT * FROM alerts WHERE user_id=? ORDER BY created DESC LIMIT 100',(current['id'],))

@app.post('/api/alerts/{aid}/acknowledge')
def acknowledge(aid:str,current=Depends(user)):
    db.execute('UPDATE alerts SET acknowledged=1 WHERE id=? AND user_id=?',(aid,current['id']))
    return {'ok':True}

class Device(BaseModel):token:str=Field(pattern=r'^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]+\]$')
@app.post('/api/devices')
def device(body:Device,current=Depends(user)):
    db.execute('INSERT INTO devices VALUES(?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,created=excluded.created',(body.token,current['id'],time.time()))
    return {'ok':True}

@app.delete('/api/devices')
def unregister_device(body:Device,current=Depends(user)):
    db.execute('DELETE FROM devices WHERE token=? AND user_id=?',(body.token,current['id']))
    return {'ok':True}

@app.get('/api/advisory')
def advisory(region:str='kaduna',current=Depends(user)):
    record=db.one("SELECT * FROM scans WHERE region=? AND status='complete' ORDER BY updated DESC LIMIT 1",(region,))
    if not record:return {'region':region,'updated':None,'title':'No analyzed field evidence in this region yet.','source_ids':[]}
    result=json.loads(record['result'])
    receipts=db.rows('SELECT id,title,url,provider,retrieved FROM sources WHERE scan_id=?',(record['id'],))
    receipts=[s for s in receipts if s['id'] in result['source_ids']]
    can_open=current['role']=='manager' or record['user_id']==current['id']
    return {'region':region,'updated':record['updated'],'title':result['verdict'],'source_ids':result['source_ids'],'sources':receipts,'scan_id':record['id'] if can_open else None,'grounded':result['grounded']}

@app.post('/api/jobs/recheck')
async def recheck(current=Depends(admin)):return await pipeline.recheck()

@app.get('/api/public/stats')
def stats():
    return {'scans':db.one("SELECT count(*) n FROM scans WHERE result IS NOT NULL AND supersedes IS NULL")['n'],'checks':db.one('SELECT count(*) n FROM sources')['n'],'decisions':db.one("SELECT count(*) n FROM scans WHERE result IS NOT NULL")['n'],'savings':{c:db.one('SELECT coalesce(sum(saving),0) n FROM ledger WHERE currency=?',(c,))['n'] for c in ['USD','NGN']},'updated':time.time()}

@app.get('/api/events')
async def stream(request:Request,after:int=0,current=Depends(user)):
    async def generate():
        nonlocal after
        deadline=time.time()+50
        while time.time()<deadline:
            if await request.is_disconnected():break
            for e in db.rows('SELECT id,kind,created FROM events WHERE id>? ORDER BY id LIMIT 100',(after,)):
                after=e['id'];yield f'id: {after}\nevent: update\ndata: {json.dumps(e)}\n\n'
            yield ': heartbeat\n\n'
            await asyncio.sleep(3)
    return StreamingResponse(generate(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})


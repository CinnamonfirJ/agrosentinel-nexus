"""Persisted background queue with LangGraph execution and auditable tool events."""
import asyncio,json,time,uuid,os
from typing import TypedDict
from langgraph.graph import StateGraph,START,END
from . import db,providers,infrastructure

class State(TypedDict,total=False):
    scan:dict
    diagnosis:dict
    sources:list
    warnings:list
    result:dict

async def classify(state:State):
    scan=state['scan'];sid=scan['id']
    db.execute('UPDATE scans SET status=?,stage=?,updated=? WHERE id=?',('analyzing',0,time.time(),sid))
    db.event(sid,'stage',stage=0,status='running',message='Inspecting leaf specimen',model=db.setting('vision_model'))
    diagnosis=await providers.triage(scan)
    db.event(sid,'stage',stage=0,status='done',message=diagnosis['disease'],model=diagnosis['model'],usage=diagnosis['usage'])
    return {'diagnosis':diagnosis}

async def grounding(state:State):
    scan=state['scan'];sid=scan['id']
    db.execute('UPDATE scans SET stage=1,updated=? WHERE id=?',(time.time(),sid))
    db.event(sid,'stage',stage=1,status='running',message='Retrieving weather, market and input evidence')
    sources,warnings=await providers.ground(scan,state['diagnosis'])
    for source in sources:
        db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET scan_id=excluded.scan_id,kind=excluded.kind,query=excluded.query,url=excluded.url,title=excluded.title,content=excluded.content,retrieved=excluded.retrieved,provider=excluded.provider',(source['id'],sid,source['kind'],source['query'],source['url'],source['title'],source['content'],source['retrieved'],source['provider']))
        db.event(sid,'source',source_id=source['id'],query=source['query'],url=source['url'],provider=source['provider'])
    db.event(sid,'stage',stage=1,status='done',message=f'{len(sources)} sources retrieved',warnings=warnings)
    return {'sources':sources,'warnings':warnings}

async def planning(state:State):
    sid=state['scan']['id']
    db.execute('UPDATE scans SET stage=2,updated=? WHERE id=?',(time.time(),sid))
    db.event(sid,'stage',stage=2,status='running',message='Synthesizing an evidence-linked decision',model=db.setting('reasoning_model'))
    result=await providers.reason(state['scan'],state['diagnosis'],state['sources'],state['warnings'])
    with db.connect() as c:
        c.execute('UPDATE scans SET status=?,stage=3,result=?,error=NULL,updated=? WHERE id=?',('complete',json.dumps(result),time.time(),sid))
        c.execute('DELETE FROM ledger WHERE scan_id=?',(sid,))
        for kind in {s['kind'] for s in state['sources']}:
            evidence=[s for s in state['sources'] if s['kind']==kind]
            c.execute('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),sid,time.time(),kind,evidence[0]['query'],' · '.join(s['title'] for s in evidence)[:300],result['verdict'],None,json.dumps([s['id'] for s in evidence]),'USD'))
        c.execute('INSERT INTO events(scan_id,created,kind,payload) VALUES(?,?,?,?)',(sid,time.time(),'stage',json.dumps({'stage':2,'status':'done','message':result['verdict'],'model':result['model'],'usage':result['usage']})))
    parent=state['scan'].get('supersedes')
    if parent:
        db.execute('UPDATE alerts SET new_plan=? WHERE scan_id=?',(json.dumps({'scan_id':sid,'result':result}),parent))
    await notify(state['scan']['user_id'],'Scan analyzed',result['verdict'],sid)
    return {'result':result}

builder=StateGraph(State)
builder.add_node('triage',classify);builder.add_node('grounding',grounding);builder.add_node('planning',planning)
builder.add_edge(START,'triage');builder.add_edge('triage','grounding');builder.add_edge('grounding','planning');builder.add_edge('planning',END)
graph=builder.compile()

async def notify(user_id,title,body,scan_id=None,old_plan=None,new_plan=None):
    db.execute('INSERT INTO alerts(id,user_id,scan_id,created,title,body,old_plan,new_plan) VALUES(?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),user_id,scan_id,time.time(),title,body,old_plan,new_plan))
    await deliver_push(user_id,title,body,scan_id)

async def deliver_push(user_id,title,body,scan_id=None):
    try:
        tokens=db.rows('SELECT token FROM devices WHERE user_id=?',(user_id,))
        for token in tokens:
            try:
                response=await providers.request('POST','https://exp.host/--/api/v2/push/send',json={'to':token['token'],'title':title,'body':body[:500],'data':{'scan_id':scan_id},'sound':'default'})
                ticket=response.get('data',{})
                if ticket.get('status')=='error':
                    db.event(scan_id,'push_rejected',response=ticket)
                    if ticket.get('details',{}).get('error')=='DeviceNotRegistered':db.execute('DELETE FROM devices WHERE token=?',(token['token'],))
                else:db.event(scan_id,'push',response=response)
            except Exception as error:db.event(scan_id,'push_error',message=str(error))
    except db.DatabaseError:
        # The persistent in-app alert is already committed. Database recovery
        # must not turn that successful write into a duplicate client retry.
        return

lock=asyncio.Lock()
_wake=None

def wake_worker():
    if _wake is not None:_wake.set()

async def worker():
    global _wake
    event=asyncio.Event();_wake=event
    try:await _worker(event)
    finally:
        if _wake is event:_wake=None

async def _worker(event):
    recover=True
    while True:
        event.clear();scan=None
        try:
            async with lock:
                if infrastructure.migrating():
                    await asyncio.sleep(1)
                    continue
                if recover:
                    db.execute("UPDATE scans SET status='queued' WHERE status='analyzing'")
                    recover=False
                if all([db.setting('nebius_api_key'),db.setting('tavily_api_key'),db.setting('vision_model'),db.setting('reasoning_model')]):
                    db.execute("UPDATE scans SET status='queued' WHERE status='awaiting_services'")
                scan=db.one("SELECT * FROM scans WHERE status='queued' ORDER BY created LIMIT 1")
                if scan:
                    db.execute('UPDATE scans SET status=?,attempts=attempts+1 WHERE id=?',('analyzing',scan['id']))
                    try:await graph.ainvoke({'scan':scan})
                    except asyncio.CancelledError:raise
                    except db.DatabaseError:raise
                    except Exception as error:
                        message=str(error) if isinstance(error,(providers.ProviderError,infrastructure.InfrastructureError)) else 'Analysis failed validation. Retry or contact the workspace administrator.'
                        db.execute('UPDATE scans SET status=?,error=?,updated=? WHERE id=?',('failed',message,time.time(),scan['id']))
                        db.event(scan['id'],'error',message=message)
        except asyncio.CancelledError:raise
        except db.DatabaseError:
            recover=True
            await asyncio.sleep(5)
            continue
        if scan:await asyncio.sleep(1)
        else:
            try:await asyncio.wait_for(event.wait(),timeout=float(os.environ.get('AGRO_QUEUE_POLL_SECONDS','900')))
            except TimeoutError:pass

async def recheck():
    async with lock:
        if infrastructure.migrating():return {'checked':0,'invalidated':0,'paused_for_migration':True}
        return await _recheck()

async def _recheck():
    """Invalidate completed plans when current wind/rain changes materially."""
    scans=db.rows("SELECT * FROM scans WHERE status='complete' AND lat IS NOT NULL AND created>?",(time.time()-86400,))
    changed=0
    for scan in scans:
        plan=json.loads(scan['result']);previous=(plan.get('weather') or {}).get('current') or {}
        if not previous:continue
        try:source=await providers.weather(scan['lat'],scan['lon'])
        except providers.ProviderError:continue
        current=source['data'].get('current',{})
        threshold=float(db.setting('wind_threshold','20'))
        wind_changed=current.get('wind_speed_10m',0)>=threshold and previous.get('wind_speed_10m',0)<threshold
        rain_changed=current.get('precipitation',0)>.5 and previous.get('precipitation',0)<=.5
        if wind_changed or rain_changed:
            revision=str(uuid.uuid4())
            status='queued' if all([db.setting('nebius_api_key'),db.setting('tavily_api_key'),db.setting('vision_model'),db.setting('reasoning_model')]) else 'awaiting_services'
            title='Weather changed: review your plan'
            body='Do not apply the old plan. Wind or rain crossed your workspace threshold. Updated analysis has been queued.'
            with db.connect() as c:
                c.execute("UPDATE scans SET status='invalidated',updated=? WHERE id=?",(time.time(),scan['id']))
                c.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)',(source['id'],scan['id'],'Weather',source['query'],source['url'],source['title'],source['content'],source['retrieved'],source['provider']))
                c.execute('INSERT INTO scans(id,user_id,client_id,created,updated,region,crop,note,lat,lon,image,status,supersedes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(revision,scan['user_id'],'weather-revision-'+revision,time.time(),time.time(),scan['region'],scan['crop'],scan['note']+' Weather changed; reassess previous plan.',scan['lat'],scan['lon'],scan['image'],status,scan['id']))
                c.execute('INSERT INTO alerts(id,user_id,scan_id,created,title,body,old_plan,new_plan) VALUES(?,?,?,?,?,?,?,?)',(str(uuid.uuid4()),scan['user_id'],scan['id'],time.time(),title,body,scan['result'],json.dumps({'pending_scan_id':revision,'source_id':source['id']})))
            wake_worker()
            await deliver_push(scan['user_id'],title,body,scan['id'])
            changed+=1
    db.event(None,'weather_recheck',checked=len(scans),invalidated=changed)
    return {'checked':len(scans),'invalidated':changed}

async def scheduler():
    while True:
        await asyncio.sleep(900)
        try:await recheck()
        except asyncio.CancelledError:raise
        except Exception:
            try:db.event(None,'scheduler_error',message='Weather recheck failed; next scheduled attempt remains active.')
            except db.DatabaseError:pass


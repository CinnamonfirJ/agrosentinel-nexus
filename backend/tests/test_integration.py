"""Deterministic integration tests. Provider doubles exist only in this test module."""
import asyncio,io,json,os,tempfile,time,uuid
from pathlib import Path
from fastapi.testclient import TestClient
from PIL import Image
import pytest
from backend import db,providers,pipeline
from backend.main import app,attempts

@pytest.fixture(autouse=True)
def clean():
    with db.connect() as c:
        for table in ['alerts','devices','pairing','sessions','assignments','ledger','sources','events','scans','users','config']:c.execute('DELETE FROM '+table)
    attempts.clear()
    yield

@pytest.fixture
def client():return TestClient(app)

def manager(client):
    r=client.post('/api/auth/register',json={'email':'manager@example.test','password':'test-password-12345','name':'Manager'})
    assert r.status_code==200
    return r.json()

def picture():
    f=io.BytesIO();Image.new('RGB',(1200,900),'green').save(f,'JPEG');return f.getvalue()

def capture(client,client_id='capture-1',**fields):
    return client.post('/api/scan',files={'image':('leaf.jpg',picture(),'image/jpeg')},data={'region':'kaduna','crop':'Tomato','client_id':client_id,'lat':10.5,'lon':7.4,**fields})

def test_missing_services_are_explicit_and_no_fake_statistics(client):
    manager(client)
    r=capture(client);assert r.status_code==202
    scan=r.json();assert scan['status']=='awaiting_services' and scan['result'] is None
    assert Path(db.ROOT/'images'/f'{scan["id"]}.jpg').exists()
    result=client.get('/api/region-map?region=kaduna').json()
    assert result['clusters']==[] and result['kpis']['detections']==0 and result['kpis']['savings']['USD']==0
    assert result['scans'][0]['id']==scan['id']
    assert client.post('/api/scans/'+scan['id']+'/retry').status_code==409

def test_upload_idempotency_and_compression(client):
    manager(client);first=capture(client).json();second=capture(client).json()
    assert first['id']==second['id']
    assert db.one('SELECT count(*) n FROM scans')['n']==1
    image=client.get(first['image_url']);assert image.status_code==200
    assert max(Image.open(io.BytesIO(image.content)).size)<=1024

def test_map_feed_is_bounded_without_truncating_aggregation(client):
    manager(client);scan=capture(client).json()
    with db.connect() as c:
        for i in range(150):
            c.execute('INSERT INTO scans(id,user_id,client_id,created,updated,region,crop,note,lat,lon,image,status) SELECT ?,user_id,?,created,updated,region,crop,note,lat,lon,image,status FROM scans WHERE id=?',(str(uuid.uuid4()),'bulk-'+str(i),scan['id']))
        plan={'diagnosis':{'is_leaf':True,'confidence':.8,'disease':'Test lesion','crop':'Tomato'},'verdict':'Inspect','spray_deferred':False}
        c.execute("UPDATE scans SET status='complete',result=?",(json.dumps(plan),))
    snapshot=client.get('/api/region-map?region=kaduna').json()
    assert len(snapshot['scans'])==100 and snapshot['scan_total']==151
    assert snapshot['kpis']['detections']==151 and snapshot['clusters'][0]['count']==151

def test_invalid_image_and_coordinates_are_rejected(client):
    manager(client)
    assert client.post('/api/scan',files={'image':('x.jpg',b'not an image','image/jpeg')}).status_code==422
    assert capture(client,lat='nan').status_code==422
    assert capture(client,lat='200').status_code==422

def test_session_is_real_and_logout_revokes_token(client):
    result=manager(client)
    assert client.get('/api/auth/me').json()['name']=='Manager'
    fake=TestClient(app);fake.cookies.set('agro_demo_session','1')
    assert fake.get('/api/scans').status_code==401
    assert client.post('/api/auth/logout').status_code==200
    assert client.get('/api/scans',headers={'Authorization':'Bearer '+result['token']}).status_code==401

def test_pairing_is_single_use_and_device_can_access_same_scan(client):
    manager(client);scan=capture(client).json();code=client.post('/api/auth/pair').json()['code']
    phone=TestClient(app);response=phone.post('/api/auth/redeem',json={'code':code})
    assert response.status_code==200
    assert phone.get('/api/scans/'+scan['id']).status_code==200
    assert phone.post('/api/auth/redeem',json={'code':code}).status_code==401

def test_ownership_and_manager_only_operations(client):
    manager(client);scan=capture(client).json()
    assert client.post('/api/team',json={'email':'field@example.test','name':'Field','password':'field-password-123'}).status_code==200
    phone=TestClient(app);phone.post('/api/auth/login',json={'email':'field@example.test','password':'field-password-123'})
    assert phone.get('/api/scans/'+scan['id']).status_code==403
    assert phone.post('/api/settings/services',json={}).status_code==403

def test_encrypted_settings_never_return_keys(client):
    manager(client);db.set_setting('tavily_api_key','test-private-value')
    stored=db.one("SELECT value FROM config WHERE key='tavily_api_key'")['value']
    assert 'test-private-value' not in stored
    assert 'test-private-value' not in client.get('/api/settings').text

def test_dispatch_reaches_assignee_and_status_is_authorized(client):
    manager(client)
    person=client.post('/api/team',json={'email':'dispatch@example.test','name':'Field','password':'field-password-123'}).json()
    assignment=client.post('/api/assignments',json={'region':'kaduna','cluster_key':'10.5:7.4:Leaf lesion','assignee':person['id'],'note':'Inspect northern plots.'})
    assert assignment.status_code==200
    aid=assignment.json()['id']
    phone=TestClient(app);phone.post('/api/auth/login',json={'email':'dispatch@example.test','password':'field-password-123'})
    tasks=phone.get('/api/assignments').json()
    assert tasks[0]['id']==aid and tasks[0]['note']=='Inspect northern plots.'
    assert phone.post('/api/assignments/'+aid+'/status',json={'status':'accepted'}).status_code==200
    assert phone.post('/api/assignments/'+aid+'/status',json={'status':'completed'}).status_code==200
    assert client.get('/api/region-map?region=kaduna').json()['assignments'][0]['status']=='completed'
    client.post('/api/team',json={'email':'other@example.test','name':'Other','password':'field-password-123'})
    other=TestClient(app);other.post('/api/auth/login',json={'email':'other@example.test','password':'field-password-123'})
    assert other.get('/api/assignments').json()==[]
    assert other.post('/api/assignments/'+aid+'/status',json={'status':'accepted'}).status_code==403

def test_analysis_aggregation_economics_and_audit(client,monkeypatch):
    manager(client);scan=capture(client).json();sid=scan['id'];source_id=str(uuid.uuid4())
    async def triage(s):return {'crop':'Tomato','disease':'Possible late blight','confidence':.82,'observations':['Leaf lesion'],'is_leaf':True,'model':'test-vision','usage':{'total_tokens':1}}
    evidence={'id':source_id,'kind':'Weather','query':'test query','url':'https://example.org/weather','title':'Test evidence','content':'Test-only weather response','retrieved':time.time(),'provider':'Test double'}
    async def ground(s,d):return [evidence],[]
    async def reason(s,d,e,w):return {'verdict':'Inspect before treatment.','rationale':'Test-only decision','severity':'caution','steps':[{'action':'Inspect specimen','source_ids':[source_id]}],'source_ids':[source_id],'warnings':[],'spray_deferred':True,'model':'test-reasoner','usage':{},'diagnosis':d,'grounded':True,'created':time.time(),'weather':None,'economics':None}
    monkeypatch.setattr(providers,'triage',triage);monkeypatch.setattr(providers,'ground',ground);monkeypatch.setattr(providers,'reason',reason)
    asyncio.run(pipeline.graph.ainvoke({'scan':db.one('SELECT * FROM scans WHERE id=?',(sid,))}))
    result=client.get('/api/scans/'+sid).json();assert result['status']=='complete' and result['stage']==3
    assert result['sources'][0]['id']==source_id and len(result['events'])>=8
    aggregate=client.get('/api/region-map?region=kaduna').json();assert aggregate['kpis']['detections']==1 and aggregate['clusters'][0]['count']==1
    assert client.post('/api/scans/'+sid+'/economics',json={'default_cost':100,'plan_cost':60,'currency':'USD'}).json()['saving']==40
    assert client.get('/api/region-map?region=kaduna').json()['kpis']['savings']['USD']==40
    assert client.get('/api/sources/'+source_id).json()['url']=='https://example.org/weather'
    assert client.get('/api/alerts').json()[0]['scan_id']==sid
    assert client.post('/api/team',json={'email':'advisory@example.test','name':'Regional agronomist','password':'field-password-123'}).status_code==200
    phone=TestClient(app);phone.post('/api/auth/login',json={'email':'advisory@example.test','password':'field-password-123'})
    advisory=phone.get('/api/advisory?region=kaduna').json()
    assert advisory['scan_id'] is None and advisory['sources'][0]['id']==source_id
    assert phone.get('/api/scans/'+sid).status_code==403

def test_unknown_citations_reject_plan(monkeypatch):
    db.set_setting('reasoning_model','test-reasoner')
    async def fake_chat(*args):return {'verdict':'Test','rationale':'Test','severity':'caution','steps':[{'action':'Inspect','source_ids':['invented']}],'source_ids':['invented'],'warnings':[],'spray_deferred':False},{}
    monkeypatch.setattr(providers,'chat',fake_chat)
    with pytest.raises(providers.ProviderError,match='not retrieved'):
        asyncio.run(providers.reason({'region':'kaduna','note':''},{'confidence':.8,'is_leaf':True},[],[]))

def test_weather_shift_invalidates_and_alerts(client,monkeypatch):
    current=manager(client);scan=capture(client).json();sid=scan['id']
    plan={'weather':{'current':{'wind_speed_10m':10,'precipitation':0}},'verdict':'Old plan','diagnosis':{'crop':'Tomato','disease':'Test hypothesis','confidence':.8,'is_leaf':True}}
    db.execute("UPDATE scans SET status='complete',result=? WHERE id=?",(json.dumps(plan),sid))
    async def changed(lat,lon):return {'id':str(uuid.uuid4()),'kind':'Weather','query':'weather','url':'https://example.org/forecast','title':'Test','content':'Test','retrieved':time.time(),'provider':'Test double','data':{'current':{'wind_speed_10m':30,'precipitation':0}}}
    monkeypatch.setattr(providers,'weather',changed)
    result=client.post('/api/jobs/recheck');assert result.status_code==200 and result.json()['invalidated']==1
    assert client.get('/api/scans/'+sid).json()['status']=='invalidated'
    revision=client.get('/api/scans/'+sid).json()['revision_id']
    assert revision and client.get('/api/scans/'+revision).json()['status']=='awaiting_services'
    assert client.post('/api/scans/'+sid+'/retry').json()['scan_id']==revision
    assert client.get('/api/region-map?region=kaduna').json()['kpis']['detections']==1
    alert=client.get('/api/alerts').json()[0]
    assert client.post('/api/alerts/'+alert['id']+'/acknowledge').status_code==200
    assert client.get('/api/alerts').json()[0]['acknowledged']==1

def test_no_provider_substitution_when_grounding_fails(monkeypatch):
    async def unavailable(*args):raise providers.ProviderError('Tavily account unavailable')
    monkeypatch.setattr(providers,'tavily',unavailable)
    with pytest.raises(providers.ProviderError,match='Tavily account unavailable'):
        asyncio.run(providers.ground({'region':'kaduna','lat':None,'lon':None},{'crop':'Tomato','disease':'Leaf lesion'}))

def test_quote_amount_must_match_actual_excerpt(monkeypatch):
    db.set_setting('reasoning_model','test')
    evidence={'id':'source-1','content':'Supplier quotes USD 50 per 25 kg basket.'}
    async def answer(*args):return {'verdict':'Inspect','rationale':'Test','severity':'caution','steps':[{'action':'Inspect','source_ids':['source-1']}],'source_ids':['source-1'],'market_quotes':[{'item':'Tomato','kind':'Price','price_text':'USD 50','amount':500,'currency':'USD','unit':'25 kg basket','supplier':'Supplier','source_id':'source-1','excerpt':evidence['content']}]},{}
    monkeypatch.setattr(providers,'chat',answer)
    with pytest.raises(providers.ProviderError,match='amount disagreed'):
        asyncio.run(providers.reason({'region':'kaduna','note':''},{'confidence':.8,'is_leaf':True},[evidence],[]))

def test_custom_region_bounds_and_preferences(client):
    manager(client)
    assert client.post('/api/regions',json={'id':'lagos','label':'Lagos, Nigeria','west':2.5,'south':6,'east':4.5,'north':7.5}).status_code==200
    assert any(r['id']=='lagos' for r in client.get('/api/regions').json())
    assert client.get('/api/region-map?region=lagos').json()['bounds']==[2.5,6,4.5,7.5]
    assert client.post('/api/settings/preferences',json={'currency':'NGN','data_saver':False,'units':'imperial'}).status_code==200
    assert client.post('/api/settings/preferences',json={'density':'compact'}).status_code==200
    prefs=client.get('/api/settings').json()['preferences']
    assert prefs['currency']=='NGN' and prefs['data_saver'] is False and prefs['units']=='imperial' and prefs['density']=='compact'

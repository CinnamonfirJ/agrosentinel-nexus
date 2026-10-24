"""Neon migration uses real local Postgres; storage doubles stay in tests."""
import io,json,os,time,uuid
from types import SimpleNamespace
from urllib.parse import urlsplit
import psycopg,pytest
from fastapi.testclient import TestClient
from backend import db,storage,infrastructure as infra,neon
from backend.main import app
from backend.tests.test_integration import manager,capture

VALUE={'database_url':'postgresql://owner:secret-value@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=require',
       'endpoint':'https://br-example.storage.c-2.eu-central-1.aws.neon.tech','access_key':'nak-test-key','secret_key':'nsk-private-test-secret','region':'eu-central-1','bucket':'agrosentinel-captures'}

@pytest.fixture
def bootstrap(monkeypatch,tmp_path):
    monkeypatch.setattr(db,'_pool',None)
    monkeypatch.setattr(infra,'_config',{})
    monkeypatch.setattr(infra,'FILE',tmp_path/'neon.enc')
    db.initialize()
    with db.connect() as c:
        for table in reversed(db.TABLES):c.execute('DELETE FROM '+table)
    yield TestClient(app)
    infra.end_migration()
    if db._pool is not None:db._pool.close()

class Objects:
    def __init__(self):self.objects={};self.fail_capture_read=False
    def head_bucket(self,**kwargs):return {}
    def put_object(self,**kwargs):self.objects[kwargs['Key']]=(kwargs['Body'],kwargs.get('Metadata',{}));return {}
    def get_object(self,**kwargs):
        if self.fail_capture_read and kwargs['Key'].startswith('captures/'):raise OSError('test-only storage failure')
        data,metadata=self.objects[kwargs['Key']]
        return {'Body':io.BytesIO(data),'Metadata':metadata}
    def delete_object(self,**kwargs):self.objects.pop(kwargs['Key'],None);return {}

@pytest.fixture
def objects(monkeypatch):
    fake=Objects()
    monkeypatch.setattr(storage,'client',lambda value:fake)
    monkeypatch.setattr(storage.httpx,'get',lambda *a,**k:SimpleNamespace(status_code=403))
    return fake

@pytest.fixture
def target(bootstrap,monkeypatch):
    url=os.environ.get('AGRO_TEST_MIGRATION_URL')
    if not url:pytest.skip('Set a dedicated local AGRO_TEST_MIGRATION_URL to test real Postgres migration.')
    parsed=urlsplit(url)
    assert parsed.hostname in ('localhost','127.0.0.1') and parsed.path=='/agro_migration_test'
    pool=db.make_pool(url)
    with db.pool_connection(pool) as c:
        db.initialize_connection(c)
        for table in reversed(db.TABLES):c.execute('DELETE FROM '+table)
    pool.close()
    monkeypatch.setattr(infra,'validate',lambda value:{**value,'database_url':url})
    return url

def test_config_is_encrypted_and_status_never_exposes_credentials(bootstrap):
    normalized=infra.validate(dict(VALUE))
    staged=infra.stage(normalized);infra.publish(staged);infra.activate(normalized)
    assert b'secret-value' not in infra.FILE.read_bytes() and b'nsk-private' not in infra.FILE.read_bytes()
    assert json.loads(infra.vault.decrypt(infra.FILE.read_bytes()))==normalized
    visible=json.dumps(infra.status())
    assert 'secret-value' not in visible and 'nak-test-key' not in visible and 'nsk-private' not in visible

def test_only_neon_tls_endpoints_are_accepted(bootstrap):
    for change in ({'database_url':VALUE['database_url'].replace('sslmode=require','sslmode=disable')},{'database_url':VALUE['database_url'].replace('.neon.tech','.neon.tech.evil.test')},{'endpoint':'http://127.0.0.1/storage'}):
        with pytest.raises(infra.InfrastructureError):infra.validate({**VALUE,**change})
    assert not infra.FILE.exists()

def test_public_bucket_is_rejected_and_probe_removed(bootstrap,objects,monkeypatch):
    monkeypatch.setattr(storage.httpx,'get',lambda *a,**k:SimpleNamespace(status_code=200))
    with pytest.raises(storage.StorageError,match='private'):storage.check_private(VALUE)
    assert objects.objects=={}

def test_cloud_read_failure_does_not_use_existing_local_photo(bootstrap,objects):
    name=str(uuid.uuid4())+'.jpg';(db.ROOT/'images'/name).write_bytes(b'local-original')
    infra.activate(dict(VALUE));objects.fail_capture_read=True
    with pytest.raises(storage.StorageError,match='No local replacement'):storage.read(name)
    with pytest.raises(storage.StorageError):storage.read('../vault.key')

def test_postgres_parameter_translation_preserves_literals():
    assert db.pg_sql("SELECT '?' AS literal WHERE id=? AND name LIKE '50%'",('id',))=="SELECT '?' AS literal WHERE id=%s AND name LIKE '50%%'"

def test_neon_setup_requires_manager_and_redacts_invalid_input(bootstrap):
    manager(bootstrap)
    malformed=bootstrap.post('/api/settings/neon',json={**VALUE,'secret_key':'sensitive-'*300})
    assert malformed.status_code==422 and 'sensitive-' not in malformed.text
    bootstrap.post('/api/team',json={'email':'field@neon.test','name':'Field','password':'field-password-123'})
    phone=TestClient(app);phone.post('/api/auth/login',json={'email':'field@neon.test','password':'field-password-123'})
    assert phone.get('/api/settings/neon').status_code==403
    assert phone.post('/api/settings/neon',json=VALUE).status_code==403

def test_real_migration_preserves_sessions_photos_sources_and_event_sequence(bootstrap,target,objects):
    account=manager(bootstrap);scan=capture(bootstrap).json();sid=scan['id']
    original=bootstrap.get(scan['image_url']).content
    db.set_setting('tavily_api_key','test-secret-to-preserve')
    source_id=str(uuid.uuid4())
    db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)',(source_id,sid,'Weather','test','https://example.test','Evidence','Test-only excerpt',time.time(),'Test'))
    old_id=db.one('SELECT max(id) n FROM events')['n']
    result=bootstrap.post('/api/settings/neon',json=VALUE)
    assert result.status_code==200,result.text
    assert db.is_postgres() and result.json()['photos']==1
    assert not infra.migrating() and infra.FILE.exists()
    assert bootstrap.get('/api/auth/me').json()['id']==account['user']['id']
    assert bootstrap.get(scan['image_url']).content==original
    assert bootstrap.get('/api/scans/'+sid).json()['sources'][0]['id']==source_id
    assert db.setting('tavily_api_key')=='test-secret-to-preserve'
    db.event(sid,'after_migration')
    assert db.one('SELECT max(id) n FROM events')['n']>old_id
    assert len(objects.objects)==1 and next(iter(objects.objects)).startswith('captures/')
    assert capture(bootstrap,'post-migration').status_code==202
    assert len(objects.objects)==2

def test_failed_photo_copy_rolls_back_cloud_database(bootstrap,target,objects):
    manager(bootstrap);scan=capture(bootstrap).json();objects.fail_capture_read=True
    with pytest.raises(storage.StorageError):neon.migrate(dict(VALUE))
    assert not db.is_postgres() and not infra.FILE.exists() and not infra.migrating()
    assert bootstrap.get('/api/scans/'+scan['id']).status_code==200
    with psycopg.connect(target) as c:assert c.execute('SELECT count(*) FROM users').fetchone()[0]==0

def test_existing_cloud_data_is_not_overwritten(bootstrap,target,objects):
    manager(bootstrap)
    with psycopg.connect(target) as c:c.execute("INSERT INTO users VALUES(%s,%s,%s,%s,%s,%s)",('cloud-owner','cloud@example.test','Cloud','test-only-hash','manager',time.time()))
    with pytest.raises(infra.InfrastructureError,match='already contains data'):neon.migrate(dict(VALUE))
    assert not db.is_postgres() and not infra.FILE.exists()
    with psycopg.connect(target) as c:assert c.execute('SELECT id FROM users').fetchone()[0]=='cloud-owner'

def test_retry_after_local_config_publish_failure_is_verified(bootstrap,target,objects,monkeypatch):
    manager(bootstrap);capture(bootstrap)
    publish=infra.publish
    monkeypatch.setattr(infra,'publish',lambda path:(_ for _ in ()).throw(OSError('test-only disk failure')))
    with pytest.raises(infra.InfrastructureError):neon.migrate(dict(VALUE))
    assert not db.is_postgres() and not infra.FILE.exists()
    monkeypatch.setattr(infra,'publish',publish)
    result=neon.migrate(dict(VALUE))
    assert result['status']=='connected' and db.is_postgres()

def test_worker_recovers_after_temporary_database_outage(bootstrap,monkeypatch):
    import asyncio
    from backend import pipeline
    manager(bootstrap);scan=capture(bootstrap).json()
    for key in ('nebius_api_key','tavily_api_key','vision_model','reasoning_model'):db.set_setting(key,'test-only')
    execute=db.execute;outage=[True];processed=[]
    def interrupted(sql,args=()):
        if outage[0]:
            outage[0]=False
            raise db.DatabaseError('test-only temporary database outage')
        return execute(sql,args)
    async def analyze(state):
        processed.append(state['scan']['id'])
        execute("UPDATE scans SET status='complete' WHERE id=?",(state['scan']['id'],))
    async def tick(seconds):
        if processed:raise asyncio.CancelledError()
    monkeypatch.setattr(db,'execute',interrupted)
    monkeypatch.setattr(pipeline.graph,'ainvoke',analyze)
    monkeypatch.setattr(pipeline.asyncio,'sleep',tick)
    with pytest.raises(asyncio.CancelledError):asyncio.run(pipeline.worker())
    assert processed==[scan['id']]
    assert db.one('SELECT status FROM scans WHERE id=?',(scan['id'],))['status']=='complete'

def test_real_s3_sdk_contract_uses_private_path_style_requests(bootstrap):
    import hashlib
    from botocore.stub import Stubber
    from botocore.response import StreamingBody
    name=str(uuid.uuid4())+'.jpg';body=b'compressed-test-specimen';digest=hashlib.sha256(body).hexdigest()
    s3=storage.client(VALUE)
    assert s3.meta.config.s3['addressing_style']=='path'
    assert s3.meta.config.signature_version=='s3v4'
    with Stubber(s3) as stub:
        stub.add_response('put_object',{}, {'Bucket':VALUE['bucket'],'Key':'captures/'+name,'Body':body,'ContentType':'image/jpeg','Metadata':{'sha256':digest}})
        stub.add_response('get_object',{'Body':StreamingBody(io.BytesIO(body),len(body)),'ContentLength':len(body),'Metadata':{'sha256':digest}}, {'Bucket':VALUE['bucket'],'Key':'captures/'+name})
        storage.put(name,body,VALUE)
        assert storage.read(name,VALUE)==body
        stub.assert_no_pending_responses()

def test_postgres_outage_does_not_read_bootstrap_database(bootstrap,monkeypatch):
    from contextlib import contextmanager
    manager(bootstrap)
    class UnavailablePool:
        @contextmanager
        def connection(self):
            raise psycopg.OperationalError('test-only database outage')
            yield
        def close(self):pass
    monkeypatch.setattr(db,'_pool',UnavailablePool())
    with pytest.raises(db.DatabaseError,match='No local database was substituted'):
        db.one('SELECT * FROM users')

def test_idle_worker_wakes_immediately_for_new_capture(bootstrap,monkeypatch):
    import asyncio,httpx
    from backend import pipeline
    from backend.tests.test_integration import picture
    account=manager(bootstrap)
    for key in ('nebius_api_key','tavily_api_key','vision_model','reasoning_model'):db.set_setting(key,'test-only')
    async def exercise():
        processed=asyncio.Event();ids=[]
        async def analyze(state):
            ids.append(state['scan']['id'])
            db.execute("UPDATE scans SET status='complete' WHERE id=?",(state['scan']['id'],))
            processed.set()
        monkeypatch.setattr(pipeline.graph,'ainvoke',analyze)
        task=asyncio.create_task(pipeline.worker())
        try:
            await asyncio.sleep(.05)
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://workspace.test',headers={'Authorization':'Bearer '+account['token']}) as phone:
                response=await phone.post('/api/scan',files={'image':('leaf.jpg',picture(),'image/jpeg')},data={'region':'kaduna','crop':'Tomato','client_id':'wake-test'})
            assert response.status_code==202
            await asyncio.wait_for(processed.wait(),timeout=3)
            assert ids==[response.json()['id']]
        finally:
            task.cancel()
            with pytest.raises(asyncio.CancelledError):await task
    asyncio.run(exercise())


def test_server_environment_overrides_saved_service_credentials(bootstrap,monkeypatch):
    db.set_setting('nebius_api_key','old-saved-key')
    monkeypatch.setenv('NEBIUS_API_KEY','server-owned-key')
    assert db.setting('nebius_api_key')=='server-owned-key'
    monkeypatch.setenv('NEBIUS_API_KEY','')
    assert db.setting('nebius_api_key')==''


def test_production_disallows_credentials_from_app_settings(bootstrap,monkeypatch):
    account=manager(bootstrap)
    monkeypatch.delenv('AGRO_TESTING')
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        headers={'Authorization':'Bearer '+account['token']}
        assert client.post('/api/settings/services',headers=headers,json={'nebius_key':'unexpected-app-key'}).status_code==403
        assert client.post('/api/settings/neon',headers=headers,json=VALUE).status_code==403

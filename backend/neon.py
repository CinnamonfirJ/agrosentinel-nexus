"""Verified, non-destructive cutover from this workspace into an empty Neon branch."""
import hashlib,json
from . import db,storage,infrastructure as infra

RECEIPT='__neon_migration'

def snapshot(conn):
    result={}
    for table in db.TABLES:
        rows=[dict(r) for r in conn.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall()]
        if table=='config': rows=[r for r in rows if r['key']!=RECEIPT]
        result[table]=rows
    return result

def fingerprint(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def migrate(value,guarded=False):
    if not guarded:infra.begin_migration()
    try:result=_migrate(value)
    finally:infra.end_migration()
    result['infrastructure']=infra.status()
    return result

def _migrate(value):
    if db.is_postgres():raise infra.InfrastructureError('This workspace is already using Postgres. Its existing records will not be overwritten.')
    value=infra.validate(value)
    storage.check_private(value)
    pool=db.make_pool(value['database_url']); staged=None; activated=False
    try:
        with db.connect() as source: data=snapshot(source)
        digest=fingerprint(data)
        with db.pool_connection(pool) as target:
            target.execute("SELECT pg_advisory_xact_lock(hashtext('agrosentinel-neon-migration'))")
            db.initialize_connection(target)
            existing=snapshot(target)
            if any(existing.values()):
                marker=target.execute('SELECT value FROM config WHERE key=?',(RECEIPT,)).fetchone()
                try: prior=json.loads(db.vault.decrypt(marker['value'].encode())) if marker else {}
                except Exception: prior={}
                if prior.get('fingerprint')!=digest or fingerprint(existing)!=digest:
                    raise infra.InfrastructureError('The selected Neon database already contains data. Choose an empty branch; existing cloud records will not be overwritten.')
            else:
                for table,rows in data.items():
                    if not rows:continue
                    columns=list(rows[0]);names=','.join('"'+c+'"' for c in columns)
                    target.executemany('INSERT INTO '+table+'('+names+') VALUES('+','.join('?' for _ in columns)+')',[tuple(row[c] for c in columns) for row in rows])
                if fingerprint(snapshot(target))!=digest:
                    raise infra.InfrastructureError('Database copy verification failed. The workspace was not switched.')
                target.execute("SELECT setval(pg_get_serial_sequence('events','id'),COALESCE(MAX(id),1),MAX(id) IS NOT NULL) FROM events")
                target.execute('INSERT INTO config(key,value) VALUES(?,?)',(RECEIPT,db.vault.encrypt(json.dumps({'fingerprint':digest}).encode()).decode()))
            photos={row['image'] for row in data['scans']}
            for name in photos:
                original=storage.read(name)
                storage.put(name,original,value)
                if hashlib.sha256(storage.read(name,value)).digest()!=hashlib.sha256(original).digest():
                    raise infra.InfrastructureError('Photo copy verification failed. The workspace was not switched.')
            staged=infra.stage(value)
        # The receipt allows a verified retry if the final local rename fails after commit.
        infra.publish(staged); staged=None
        db.activate(pool,value); activated=True
        return {'status':'connected','records':{table:len(rows) for table,rows in data.items()},'photos':len(photos),'infrastructure':infra.status()}
    except infra.InfrastructureError:raise
    except Exception:
        raise infra.InfrastructureError('Neon migration could not finish. The local workspace was not switched; check credentials, permissions and network, then retry.') from None
    finally:
        if staged is not None:staged.unlink(missing_ok=True)
        if not activated:pool.close()

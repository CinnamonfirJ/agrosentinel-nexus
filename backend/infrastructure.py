"""Encrypted connection bootstrap, independent of the database it connects to."""
import json, os, threading
from pathlib import Path
from urllib.parse import urlsplit
from cryptography.fernet import Fernet

class InfrastructureError(RuntimeError): pass

if os.environ.get('VERCEL') and not os.environ.get('AGRO_TESTING'):
    required = ('DATABASE_URL','AWS_ENDPOINT_URL_S3','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION','AGRO_VAULT_KEY')
    missing = [name for name in required if not os.environ.get(name)]
    if missing:raise InfrastructureError('Missing Vercel server environment variables: ' + ', '.join(missing))
ROOT = Path(os.environ.get('AGRO_DATA_DIR', '/tmp/agrosentinel' if os.environ.get('VERCEL') else Path(__file__).parent / 'data'))
ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / 'images').mkdir(exist_ok=True)
keyfile = ROOT / 'vault.key'
if not keyfile.exists() and not os.environ.get('AGRO_VAULT_KEY'):
    if (ROOT/'neon.enc').exists():
        raise InfrastructureError('Restore the original workspace vault.key before opening its Neon connection.')
    keyfile.write_bytes(Fernet.generate_key())
    keyfile.chmod(0o600)
vault = Fernet(os.environ.get('AGRO_VAULT_KEY', '').encode() or keyfile.read_bytes())
FILE = ROOT / 'neon.enc'
_lock = threading.RLock()
_migrating = threading.Event()

def migrating(): return _migrating.is_set()

def begin_migration():
    with _lock:
        if _migrating.is_set():raise InfrastructureError('A Neon migration is already in progress.')
        _migrating.set()

def end_migration(): _migrating.clear()
_config = json.loads(vault.decrypt(FILE.read_bytes())) if FILE.exists() else {}
if os.environ.get('DATABASE_URL'):
    _config = {
        'database_url': os.environ['DATABASE_URL'],
        'endpoint': os.environ.get('AWS_ENDPOINT_URL_S3', ''),
        'access_key': os.environ.get('AWS_ACCESS_KEY_ID', ''),
        'secret_key': os.environ.get('AWS_SECRET_ACCESS_KEY', ''),
        'region': os.environ.get('AWS_REGION', ''),
        'bucket': os.environ.get('AGRO_CAPTURE_BUCKET', 'agrosentinel-captures'),
    }
    if not os.environ.get('AGRO_TESTING') and not all(_config.values()):
        raise InfrastructureError('Neon database and private bucket credentials must be configured together.')

def config():
    with _lock: return dict(_config)

def activate(value):
    global _config
    with _lock: _config = dict(value)

def stage(value):
    import uuid
    path = ROOT / ('neon-' + uuid.uuid4().hex + '.tmp')
    with path.open('xb') as file:
        file.write(vault.encrypt(json.dumps(value).encode()))
        file.flush(); os.fsync(file.fileno())
    path.chmod(0o600)
    return path

def publish(path):
    os.replace(path, FILE)

def validate(value):
    from psycopg.conninfo import conninfo_to_dict, make_conninfo
    try:
        if not value['database_url'].startswith(('postgresql://','postgres://')): raise ValueError()
        parts = conninfo_to_dict(value['database_url'])
        if not parts.get('host','').endswith('.neon.tech') or ',' in parts['host']: raise ValueError()
        allowed = {'host','port','user','password','dbname','sslmode','channel_binding','connect_timeout','application_name'}
        if set(parts) - allowed or not all(parts.get(k) for k in ('user','password','dbname')): raise ValueError()
        if parts.get('sslmode','require') not in ('require','verify-full','verify-ca'): raise ValueError()
        parts.setdefault('sslmode','require'); parts.setdefault('channel_binding','require')
        parts['connect_timeout']='10'; parts['application_name']='agrosentinel-nexus'
        value = {**value, 'database_url':make_conninfo(**parts)}
    except Exception:
        raise InfrastructureError('Enter a Neon Postgres connection URI with SSL enabled. Connection details were not saved.') from None
    try:
        endpoint = urlsplit(value['endpoint']);port=endpoint.port
    except ValueError:
        raise InfrastructureError('Use the HTTPS S3 endpoint shown for your Neon branch.') from None
    if endpoint.scheme != 'https' or not (endpoint.hostname or '').endswith('.neon.tech') or '.storage.' not in endpoint.hostname or endpoint.username or endpoint.password or endpoint.query or endpoint.fragment or endpoint.path not in ('','/') or port not in (None,443):
        raise InfrastructureError('Use the HTTPS S3 endpoint shown for your Neon branch.')
    import re
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]',value['bucket']) or '..' in value['bucket']:
        raise InfrastructureError('Enter a valid private bucket name, such as agrosentinel-captures.')
    if not all(value.get(k,'').strip() for k in ('access_key','secret_key','region')):
        raise InfrastructureError('Storage access key, secret key and region are required.')
    return value

def status():
    value=config()
    from psycopg.conninfo import conninfo_to_dict
    parts=conninfo_to_dict(value['database_url']) if value.get('database_url') else {}
    return {
        'migrating':migrating(),
        'database': {'provider':'neon-postgres' if parts else 'sqlite-bootstrap','connected':bool(parts),'host':parts.get('host',''),'name':parts.get('dbname','')},
        'storage': {'provider':'neon-object-storage' if value.get('endpoint') else 'local-bootstrap','bucket':value.get('bucket','agrosentinel-captures'),'region':value.get('region','')},
    }

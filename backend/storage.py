"""Private captures, served only through the existing authorized image endpoint."""
import hashlib, uuid
from functools import lru_cache
from urllib.parse import quote
import boto3, httpx
from botocore.config import Config
from . import infrastructure as infra

class StorageError(infra.InfrastructureError): pass

def client(value):
    return _client(value['endpoint'],value['region'],value['access_key'],value['secret_key'])

@lru_cache(maxsize=4)
def _client(endpoint,region,access_key,secret_key):
    return boto3.client('s3', endpoint_url=endpoint, region_name=region,
        aws_access_key_id=access_key, aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4',s3={'addressing_style':'path'},connect_timeout=10,read_timeout=30,
            retries={'max_attempts':2,'mode':'standard'},request_checksum_calculation='when_required',response_checksum_validation='when_required'))

def check_private(value):
    s3=client(value); bucket=value['bucket']; key='checks/'+uuid.uuid4().hex
    body=uuid.uuid4().bytes
    try:
        s3.head_bucket(Bucket=bucket)
        s3.put_object(Bucket=bucket,Key=key,Body=body,ContentType='application/octet-stream')
        result=s3.get_object(Bucket=bucket,Key=key)
        try: actual=result['Body'].read()
        finally: result['Body'].close()
        if actual!=body: raise StorageError('Neon storage read-back verification failed.')
        response=httpx.get(value['endpoint'].rstrip('/')+'/'+quote(bucket,safe='')+'/'+key,timeout=15,follow_redirects=False)
        if response.status_code not in (401,403,404):
            raise StorageError('The bucket could not be verified private. Choose private access in the Neon Console.')
    except StorageError: raise
    except Exception:
        raise StorageError('Neon bucket validation failed. Check the bucket, branch endpoint and storage write credential.') from None
    finally:
        try: s3.delete_object(Bucket=bucket,Key=key)
        except Exception: pass

def _key(name):
    if '/' in name or '\\' in name or name in ('.','..'): raise StorageError('Invalid capture object key.')
    return 'captures/'+name

def put(name, data, value=None):
    _key(name)
    value=value if value is not None else infra.config()
    if not value.get('endpoint'):
        (infra.ROOT/'images'/name).write_bytes(data)
        return
    try:
        client(value).put_object(Bucket=value['bucket'],Key=_key(name),Body=data,ContentType='image/jpeg',Metadata={'sha256':hashlib.sha256(data).hexdigest()})
    except Exception:
        raise StorageError('The capture could not be stored in Neon. Retry when storage is available.') from None

def read(name, value=None):
    _key(name)
    value=value if value is not None else infra.config()
    if not value.get('endpoint'):
        try: return (infra.ROOT/'images'/name).read_bytes()
        except OSError: raise StorageError('The stored capture is unavailable.') from None
    try:
        result=client(value).get_object(Bucket=value['bucket'],Key=_key(name))
        try: data=result['Body'].read()
        finally: result['Body'].close()
        expected=result.get('Metadata',{}).get('sha256')
        if expected and hashlib.sha256(data).hexdigest()!=expected: raise StorageError('Capture integrity check failed.')
        return data
    except StorageError: raise
    except Exception: raise StorageError('The Neon capture is unavailable. No local replacement was used.') from None

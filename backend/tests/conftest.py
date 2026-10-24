"""All tests use disposable storage; never inherit a deployed database connection."""
import os,tempfile
from urllib.parse import urlsplit
_data=tempfile.TemporaryDirectory(prefix='agro-tests-')
os.environ['AGRO_DATA_DIR']=_data.name
os.environ['AGRO_TESTING']='1'
if os.environ.get('AGRO_TEST_POSTGRES_URL'):
    target=urlsplit(os.environ['AGRO_TEST_POSTGRES_URL'])
    if target.hostname not in ('localhost','127.0.0.1') or target.path!='/agro_test':
        raise RuntimeError('Postgres tests require a dedicated local agro_test database.')
    os.environ['DATABASE_URL']=os.environ['AGRO_TEST_POSTGRES_URL']
    # A previous disposable run used a different vault key. Clear test-only
    # encrypted config before importing the application; fixtures clear rows.
    import psycopg
    with psycopg.connect(os.environ['DATABASE_URL']) as connection:
        if connection.execute("SELECT to_regclass('public.config')").fetchone()[0]:
            connection.execute('DELETE FROM public.config')
else:
    os.environ.pop('DATABASE_URL',None)
for name in ('AWS_ENDPOINT_URL_S3','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_REGION','AGRO_VAULT_KEY'):
    os.environ.pop(name,None)

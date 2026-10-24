import asyncio
import importlib
import os
import subprocess
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from backend import main, pipeline
from backend.tests.test_integration import clean

def test_service_root_entrypoint_exports_existing_app():
    assert importlib.import_module('backend.index').app is main.app

def test_entrypoint_imports_from_isolated_service_directory(tmp_path):
    env=dict(os.environ,AGRO_TESTING='1',AGRO_DATA_DIR=str(tmp_path))
    env.pop('DATABASE_URL',None)
    env.pop('AGRO_VAULT_KEY',None)
    result=subprocess.run([sys.executable,'-c','from index import app; assert app.title == "AgroSentinel Nexus"'],
        cwd=Path(__file__).resolve().parents[1],env=env,capture_output=True,timeout=30)
    assert result.returncode==0, 'The standalone backend service entrypoint failed to import.'

def test_vercel_api_lifespan_does_not_start_workers(monkeypatch):
    def unexpected():raise AssertionError('HTTP service must not launch a continuous worker')
    monkeypatch.setenv('VERCEL','1')
    monkeypatch.setattr(pipeline,'worker',unexpected)
    monkeypatch.setattr(pipeline,'scheduler',unexpected)
    async def exercise():
        async with main.lifespan(main.app):pass
    asyncio.run(exercise())

def test_direct_api_rejects_cross_origin_cookie_mutations():
    with TestClient(main.app) as client:
        result=client.post('/api/auth/register',headers={'Origin':'https://untrusted.example'},json={})
        assert result.status_code==403

def test_vercel_authentication_uses_secure_session_cookie(monkeypatch):
    monkeypatch.setenv('VERCEL','1')
    with TestClient(main.app) as client:
        result=client.post('/api/auth/register',json={'email':'vercel@example.test','password':'test-password-12345','name':'Manager'})
        assert result.status_code==200
        assert 'Secure' in result.headers['set-cookie']

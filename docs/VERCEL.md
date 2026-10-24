# Vercel services deployment

The root `vercel.json` defines `app` (Next.js) and `backend` (FastAPI).
Public paths retain their original prefix. `/api/network` and
`/api/download/android` belong to Next.js and precede the general `/api/*`
backend rule. Everything else enters Next.js. Backend `/docs` and `/openapi.json`
are not exposed by this route table.

`app` calls `backend` using the caller-side `BACKEND_URL` binding. Vercel injects
it at function runtime. Do not set it in the dashboard, .env or next.config,
and do not use it in middleware or during builds. Native/browser clients
continue using the single public domain and `/api/*`. Local npm scripts retain
the loopback backend default only outside Vercel.

## Deployment environment

Configure server secrets in the Vercel project environment, never in source:
`DATABASE_URL`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AGRO_CAPTURE_BUCKET`, `AGRO_VAULT_KEY`,
`NEBIUS_API_KEY`, `NEBIUS_ENDPOINT`, `VISION_MODEL`, `REASONING_MODEL`,
and `TAVILY_API_KEY`. The vault key must be a valid Fernet key and remain the
same across the API and worker. Reuse the existing private vault key if
encrypted records already exist. Never regenerate it on each deployment.

The API uses ephemeral `/tmp/agrosentinel` only for scratch space. Vercel
requires Neon/storage configuration and a supplied vault key; it cannot use
the laptop's SQLite database or private files. Use separate Neon branches and
storage for previews versus production. No local .env or data files are uploaded.

## Separately hosted workers

Per the selected deployment scope, no Vercel daemon is configured. Vercel API
lifespan does not start infinite inference/weather tasks. On a separate
always-on host, install `backend/requirements.txt` and run exactly one instance:

```sh
python -m backend.run_worker
```

Supply the same production database, private storage, vault key and provider
environment there. This process polls the shared queue every five seconds and
performs weather rechecks every fifteen minutes. Set `AGRO_WORKER_MODE=external`
on any separately hosted HTTP process to prevent duplicate workers. Process-local
locks do not coordinate multiple worker replicas: run one worker only. No
cross-service binding is needed for the worker; it communicates through Neon
and provider APIs. Without this host running, uploads queue but are not analyzed.

## Local verification

Use the current Vercel CLI with services support:

```sh
vercel dev -L
```

This runs both HTTP services and injects the binding. For a linked project,
`vercel dev` uses its development environment. Run the external worker separately
when testing that topology (`AGRO_WORKER_MODE=external` for both HTTP processes).
Check `/api/live`, `/api/health`, create the first manager at `/login`, then
verify authenticated dashboard and API requests. Preserve `/api` on every request.

The backend pins Python 3.12, required by the current Vercel Python runtime.
For local `vercel dev`, use a Python 3.12 backend virtual environment as well.
An existing Python 3.11 environment can run the application tests but cannot
install the current `vercel-runtime` package. Local verification here detected
both services but stopped on that interpreter mismatch; it did not validate a
complete Vercel request round trip or cloud deployment.

The Android APK is excluded from source/deployment; its helper route will report
unavailable until a release distribution URL is implemented. The Expo app itself
is distributed through native builds, not as a Vercel service. Deployment of the
HTTP services does not establish live provider, worker-host or device validation.

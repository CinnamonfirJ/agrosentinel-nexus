# Memory — AgroSentinel Nexus server configuration and Neon integration

Last updated: 2026-10-23 22:22 +01:00

## What was built

- Implemented Neon Postgres and private Neon Object Storage support with verified record/photo migration, encrypted legacy connection bootstrap, database outage recovery, and no cloud-to-local failure substitution. Main additions: backend/infrastructure.py, storage.py, neon.py, schema.sql and tests/test_neon.py; adapted backend/db.py, main.py, providers.py and pipeline.py.
- Latest user correction supersedes the earlier Settings-based credential approach: created root .env and .env.example; backend/__init__.py loads root .env before database initialization using python-dotenv. Process environment overrides the file; environment settings override stored settings, including explicitly blank values.
- Removed provider/Neon credential forms from app/service-settings.tsx. Credential write endpoints reject production requests; legacy migration code remains but its HTTP entry point is disabled outside tests. Docker Compose injects .env. Updated requirements, startup dependency checks, README and docs/OPERATIONS.md.
- Drafted a Markdown Devpost project story and Built With tags in the conversation. Not published or saved as an artifact.

## Decisions made

- User explicitly wants server-side env configuration, not API keys in app Settings. No provider secrets belong in web/mobile bundles or memory.
- Use private bucket agrosentinel-captures on the Neon database branch. Neon now offers S3-compatible Object Storage; do not assume it requires an AWS account.
- End users have AgroSentinel application accounts, not Neon accounts. Fresh database tables are created at startup; the first account is the manager, who adds agronomists through Settings > Team. Current scope is one cooperative workspace per backend, not a public multi-tenant SaaS.
- User awaits Nebius Builder Program access and will provide required credentials later. No substitute inference/search providers or fabricated results. Preserve revamped UI. Support both Android and iOS, primarily Android.

## Problems solved

- Database credentials must load before app authentication and schema initialization. Root .env is now loaded even when launching uvicorn directly.
- Server environment now takes precedence over old database-stored keys; an explicitly empty env value prevents reuse of an old saved key.
- Idle capture worker now wakes on successful mutations instead of polling every second. Deployment liveness uses /api/live without a database query.
- PostgreSQL regression work caught timestamp precision issues (use DOUBLE PRECISION) and pooler compatibility issues (no startup options; prepared statements disabled).

## Current state

- Root .env was created with blank credential fields, and its loading was verified without printing values. Actual Neon, storage and paid-provider connections remain unverified. Do not claim 100% live functionality.
- Latest web production build passed. Latest complete backend run: 25 passed, 4 skipped (dedicated Postgres migration tests not enabled); subsequent Neon/config tests: 12 passed, 4 skipped, including two new env-precedence/production-write-rejection tests. Before env changes, all 29 tests passed using disposable real local Postgres plus controlled storage doubles.
- Production supervisor last started with npm run start:all. Dashboard on localhost:3000; backend on loopback:8000. Health returned 200 and setup_required true (no first app account). Services may need restarting after the final provider error-message edit; no functional behavior changed by that edit.
- No automatic migration occurs merely by setting DATABASE_URL: it opens the selected database directly. Retain old local data if needed. Persistent vault key is required for existing encrypted records. Root .env remains ignored by Git and excluded from Docker image build context.
- Earlier standalone ARM64 Android preview APK exists at apps/mobile/android/app/build/outputs/apk/release/app-release.apk with local debug signing. Android/iOS bundle exports and native type/lint checks passed earlier. Physical camera, background execution and push still need device verification; iOS distribution needs Apple signing/build access.
- Not an always-on internet deployment. Laptop must stay awake for LAN users. Public access needs HTTPS hosting and persistent server storage.
- git status reported this workspace is not a Git repository; do not assume commits or PRs exist.

## Next session starts with

Check whether the user has populated root .env without exposing its contents. If present, restart services and verify real Neon DB/storage connectivity, first-manager registration and account login. Then validate live Nebius/Tavily with an actual capture when credentials become available. Do not seed fake live data or claim provider success without real calls.

## Open questions

- Real Neon/provider credentials and model availability remain pending. Need to verify private bucket permissions on the actual branch.
- If any local workspace data must be preserved before env cutover, provide an explicit offline migration path; current production Settings migration endpoint is disabled.
- Public HTTPS hosting, physical-device behavior and push delivery remain outstanding.
- Disposable local Postgres test cluster is stopped. Test harness/dependencies remain in ignored .runtime/pg-test. A harness path bug created test data under a literal Github%20Repo sibling directory; do not delete broad parent directories. Connection details in test cache are secrets and must never be printed or copied into memory. Dedicated tests accept loopback databases named agro_test and agro_migration_test only.

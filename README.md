# AgroSentinel Nexus

Grounded field intelligence with a Next.js dashboard, Expo app for Android and iOS, and FastAPI/LangGraph backend.

## Server setup

The root `.env` has been created. Fill its blank values using `.env.example` as the reference:

- Neon: `DATABASE_URL`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AGRO_CAPTURE_BUCKET`.
- Inference: `NEBIUS_API_KEY`, `NEBIUS_ENDPOINT`, `VISION_MODEL`, `REASONING_MODEL`, `TAVILY_API_KEY`.

Use exact model IDs available to your Nebius account; the vision model must accept images. Create a private Neon bucket named `agrosentinel-captures` on the database branch.

```sh
npm install
npm run dev:all
```

The backend loads `.env` before connecting. Restart after changes. Docker Compose injects the same file. Process environment takes priority over `.env`, which takes priority over saved settings. Never prefix secrets with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. `.env` is excluded from Git and Docker build context.

## Accounts and access

Startup creates the app tables in the configured database. Open http://localhost:3000/login to create the first manager account. Managers add agronomists in Settings > Team. These are AgroSentinel accounts stored in the app database; end users need neither Neon accounts nor service keys. Credential editing in app Settings is disabled.

Phones on the same Wi-Fi use the laptop address printed at startup. Run `npm run mobile` for the native Expo app. For access beyond Wi-Fi, deploy the backend/dashboard to an always-on HTTPS host with the same secrets and persistent vault key. Local services require the laptop to remain awake.

## Data and service readiness

Blank Neon configuration retains the existing local development database. Setting `DATABASE_URL` opens Neon directly and does not copy an old SQLite workspace. Configured Neon outages never switch back to local storage. Back up `backend/data/vault.key`, or retain the same deployment `AGRO_VAULT_KEY` across restarts.

Until required inference keys and models are configured, captures await services. There are no substitute providers, sample diagnoses or fabricated economics. Live paid-provider and physical-device paths remain unverified until credentials and devices are available. Remote push requires FCM/APNs credentials and an appropriate native build.

Implemented workflows include authenticated roles, device pairing, durable capture and offline queues, LangGraph stages, source receipts, regional aggregation, geographic map/list, ledger and market evidence, quote validation, cost accounting, assignments, alerts and weather-triggered plan revisions.

See [Operations](docs/OPERATIONS.md) for installation, persistence and verification. Source briefs are in `docs/product-requirements.md` and `docs/design-brief.md`.

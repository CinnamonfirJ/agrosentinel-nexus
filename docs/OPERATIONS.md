# Running AgroSentinel Nexus

## Daily use

Run `npm run dev:all` from the repository to start the Python API and web client together. It creates the Python virtual environment and installs backend requirements if needed; the root `.env` supplies server credentials. For a built web release, run `npm run build` once and then `npm run start:all`.

Open `http://localhost:3000/login` on the laptop. On the first visit, choose an email and a password of at least 12 characters to create the workspace manager. Subsequent accounts are added from Dashboard → Settings → Team.

On a phone connected to the same Wi-Fi, use the laptop address printed at startup. That address can change when Wi-Fi changes; Settings and the install page detect the current address. Windows must permit the Node server on the private network. The service remains on the laptop: it must stay awake and connected. This LAN service is not a permanent internet deployment.

## Neon Postgres and private captures

Create a Neon project/branch with Object Storage support. Create a **private** bucket named **agrosentinel-captures** on that same branch. Do not enable public reads; the backend authenticates and authorizes image access for both web and mobile.

Fill the root `.env` with `DATABASE_URL`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AGRO_CAPTURE_BUCKET`. Storage credentials come from the Neon branch storage token. Use the Postgres URI from the Connect dialog with SSL enabled. Restart after changes. Deployed process environment takes priority; Docker Compose reads the same file. `.env` is ignored by Git and excluded from Docker build context.

On a fresh database, startup creates the app tables. Create the first manager at `/login`, then add agronomists in Settings > Team. Users have AgroSentinel accounts, not Neon accounts, and need no API keys. Setting a new database URI does not migrate an existing SQLite workspace; retain the local archive if its records are needed. Configured cloud failures never substitute local data. Run one backend instance per workspace because background coordination is process-local.

Persist `backend/data/vault.key`, or inject the same `AGRO_VAULT_KEY` across restarts. Existing encrypted data requires its original key. API credential editing in Settings is disabled; configuration belongs to the server administrator. Legacy encrypted connection files remain readable, but `.env` takes priority.

Reference: https://neon.com/docs/storage/get-started and https://neon.com/docs/storage/authentication.

## Required inference services — no substitutions

After the Builder Program grants access, fill `NEBIUS_API_KEY`, `NEBIUS_ENDPOINT`, `VISION_MODEL`, `REASONING_MODEL` and `TAVILY_API_KEY` in `.env`. Use exact available model IDs, including an image-capable vision model. Restart; awaiting captures queue once all required values exist. Keys remain on the server and are never bundled in clients.

The service does not substitute another model/provider, seed live views with examples, or generate a diagnosis when accounts are unavailable. A provider/network failure marks the run failed with an actionable message. Existing cached plans remain visibly cached. Open-Meteo is an explicitly attributed numerical weather source alongside required Tavily weather evidence; it does not replace Tavily or inference.

## Android and iOS

Run `npm run mobile` to start the native Expo bundler. Both platforms use the same application, API and storage contract. Open it in a compatible Expo Go client, or install a native build. Pair with the single-use QR from Dashboard → Settings (five-minute expiry), or sign in using the workspace address and account credentials. The native scanner accepts the JSON pairing QR; the pairing value can also be pasted.

The Expo project is linked at `https://expo.dev/accounts/jessecinnamonfir/projects/agrosentinel-nexus`.

On Windows, `./scripts/build-android.ps1` creates an ARM64 Android preview APK using the installed Android SDK and Java. The Gradle init script shortens CMake paths for Windows and limits native compile concurrency. The internal preview disables Java class shrinking to reduce build memory and uses local debug signing. After a successful build, sign in at `/install` on the phone to download it. Store releases use the EAS production signing and optimization workflow.

Native captures copy the compressed photo to the app's private document directory before upload. Queue entries retain the same client ID across retries to prevent duplicate scans. Foreground reconnects sync immediately; native background sync is registered with the platform scheduler at a minimum 15-minute interval. Android and iOS decide the actual execution time based on network and battery. Force-closing an iOS app prevents background execution until reopened.

Remote push needs a native build plus platform delivery credentials (FCM for Android; APNs/Apple signing for iOS). The app registers the real Expo push token only after notification permission. Missing delivery credentials produce a visible setup error; no successful remote delivery is claimed. Persistent in-app alerts are always available after connection. Windows cannot build or sign an iOS device binary; EAS or a Mac and Apple developer credentials are required for that distribution.

Browser service-worker offline caching and browser GPS require HTTPS or localhost. Native camera/location and durable offline capture work over the LAN API; the mobile browser can import/take a photo online over LAN. Use HTTPS hosting when deploying the browser field app beyond localhost.

## Persistence and backups

Before Neon cutover, `backend/data/agro.sqlite3` stores workspace records and `backend/data/images/` holds processed images. After cutover, these original files are retained as an archive; active records and captures live in Neon Postgres and the private bucket. `backend/data/vault.key` decrypts service settings and the local `neon.enc` connection bootstrap. All are ignored by Git. Back up this whole directory together, keep the key private and stop the server before copying a consistent backup. Losing the vault key makes saved credentials unreadable.

Analysis runs are stored before processing. A restarted backend recovers interrupted scans. The LangGraph pipeline records visual triage, grounding tool calls and validated decisions; it does not expose private model chain of thought. Weather checks run every fifteen minutes while the backend is up. A threshold crossing invalidates the previous plan, stores an alert and queues a new revision without adding a duplicate field detection.

Dispatch creates a persistent inspection for the chosen account. Agronomists see assigned inspections in the field app, can accept or complete them while connected, and can read cached assignments offline. Their status appears on the manager's cluster panel. Regional advisories share source receipts while preserving private scan access.

## Trust and economics

Source receipts retain the exact query, original URL, provider, retrieved excerpt and timestamp. Model tags identify actual configured models. Market quotes must match exact retrieved text, including the numeric amount. Missing quotes remain missing; conflicts retain all comparable units/currencies and show the conservative planning choice.

Savings are computed only from explicit user-entered costs, separated by currency. They are estimates, not realized revenue. Photo hypotheses are never labeled laboratory-confirmed diagnoses. Unsupported pesticide doses and invented prices are prohibited in the model instructions; field verification remains part of the decision.

## Verification

`backend/.venv/Scripts/python -m pytest backend/tests -q` on Windows (`backend/.venv/bin/python` on Unix) runs backend integration checks with isolated databases and provider doubles confined to the test module. `npm run typecheck` and `npm run build` check web. From `apps/mobile`, run `npx tsc --noEmit`, `npx expo lint`, and `npx expo export --platform android --platform ios`.

Real paid-provider responses cannot be verified until the Builder Program issues credentials. Device camera, background scheduling and push delivery require physical-device checks; a passing bundle export alone does not prove them.

Postgres regression tests use an explicit, disposable loopback database named `agro_test` via `AGRO_TEST_POSTGRES_URL`. The migration tests use a separate `agro_migration_test` database via `AGRO_TEST_MIGRATION_URL`. Those local test databases are cleared; the tests refuse non-loopback targets. Storage protocol doubles exist only in tests. Live Neon account connectivity and bucket permissions still require the actual project credentials.

The capture worker wakes on successful app mutations and otherwise checks for queued work every fifteen minutes. The deployment liveness probe uses /api/live without querying Postgres, allowing idle Neon compute to suspend; /api/health checks database-backed readiness.

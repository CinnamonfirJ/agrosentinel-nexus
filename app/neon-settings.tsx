"use client";
import { useEffect, useState } from "react";
import { api } from "./client";
export function NeonSettings() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    api("settings/neon")
      .then(setStatus)
      .catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    if (!status?.migrating) return;
    const timer = setInterval(() => {
      api("settings/neon")
        .then(setStatus)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [status?.migrating]);
  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    try {
      const result = await api("settings/neon", {
        method: "POST",
        body: JSON.stringify(fields),
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
      setStatus(result.infrastructure);
      form.reset();
      setMessage(
        `Connected to Neon. Verified ${result.photos} photos and ${Object.values(result.records as Record<string, number>).reduce((a, b) => a + b, 0)} database records. Your account and session are preserved.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
      api("settings/neon")
        .then(setStatus)
        .catch(() => {});
    }
  }
  return (
    <section className="panel settings">
      <div className="eyebrow">DATABASE & CAPTURES</div>
      <h2>Neon workspace</h2>
      <p>
        {status?.database.connected
          ? `Postgres · ${status.database.host} · ${status.database.name}`
          : "This workspace uses local bootstrap storage until you connect Neon."}
      </p>
      <p>
        Create a private bucket named <code>agrosentinel-captures</code> on the
        same Neon branch as the database. Photos stay behind workspace
        authentication.
      </p>
      {status?.migrating && (
        <p role="status">
          Migration is in progress. New captures stay queued on their devices
          until it finishes.
        </p>
      )}
      {status?.database.connected ? (
        <p role="status">
          Connected · bucket {status.storage.bucket} · {status.storage.region}
        </p>
      ) : (
        <form onSubmit={connect}>
          <label>
            Postgres connection URI
            <input
              name="database_url"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Paste the Neon connection string with SSL enabled"
            />
          </label>
          <label>
            Branch S3 endpoint
            <input
              name="endpoint"
              type="url"
              required
              placeholder="https://br-….storage.c-….aws.neon.tech"
            />
          </label>
          <label>
            Storage access key ID
            <input
              name="access_key"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Storage secret key
            <input
              name="secret_key"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Storage region
            <input
              name="region"
              required
              placeholder="For example: eu-central-1"
            />
          </label>
          <label>
            Private capture bucket
            <input
              name="bucket"
              required
              defaultValue="agrosentinel-captures"
            />
          </label>
          <p>
            The app verifies private read/write access, copies your existing
            records and photos, and switches only after verification. The target
            database must be empty. Original local files are retained. Keep this
            page open during migration.
          </p>
          <button
            className="primary"
            disabled={busy || !status || status.migrating}
          >
            {busy ? "Verifying and migrating…" : "Connect & migrate to Neon"}
          </button>
        </form>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "./client";
export function ServiceSettings() {
  const [settings, setSettings] = useState<any>(null),
    [message, setMessage] = useState(""),
    [qr, setQr] = useState(""),
    [pair, setPair] = useState(""),
    [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState("");
  const [deviceAddress, setDeviceAddress] = useState("");
  const [regionCatalog, setRegionCatalog] = useState<
    { id: string; label: string }[]
  >([]);
  useEffect(() => {
    api("regions")
      .then(setRegionCatalog)
      .catch(() => {});
    api("settings")
      .then(setSettings)
      .catch((e) => setMessage(e.message));
  }, []);
  async function pairDevice() {
    try {
      const result = await api("auth/pair", { method: "POST" });
      let address = window.location.origin;
      if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        const network = await api("network");
        if (!network.addresses.length)
          throw new Error(
            "No LAN address detected. Connect your laptop to Wi-Fi first.",
          );
        address = network.addresses[0].url;
      }
      setDeviceAddress(address);
      const payload = JSON.stringify({
        server: address,
        code: result.code,
      });
      setPair(payload);
      setQr(await QRCode.toDataURL(payload));
      setMessage(
        "Pairing code expires in five minutes and can be used once. Open Connect on the native app to scan it.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <section className="panel settings">
      <h2>Services & devices</h2>
      <p>Services and database connections are managed by the server administrator.
        Team members use their AgroSentinel account; no provider keys are required.</p>
      {settings && (
        <p>
          Nebius: {settings.services.nebius ? "connected" : "not connected"} ·
          Tavily: {settings.services.tavily ? "connected" : "not connected"}
        </p>
      )}
      <h3>Phone connection</h3>
      <a className="outline" href="/install">
        Open Android / iOS installation page
      </a>
      <p>
        On the same Wi-Fi, open this site using the laptop’s LAN address. Pair
        only from an address your phone can reach.
      </p>
      <button className="outline" onClick={pairDevice}>
        Generate one-time pairing QR
      </button>
      {deviceAddress && (
        <p>
          Phone workspace address: <a href={deviceAddress}>{deviceAddress}</a>
        </p>
      )}
      {qr && (
        <>
          <img
            src={qr}
            alt="Single-use device pairing QR code"
            width={220}
            height={220}
          />
          <details>
            <summary>Manual pairing value</summary>
            <textarea aria-label="Pairing value" readOnly value={pair} />
          </details>
        </>
      )}
      <h3>Team</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("team", {
              method: "POST",
              body: JSON.stringify({ email, name, password }),
            });
            setMessage("Agronomist account created.");
            setPassword("");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <label>
          Name
          <input
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Initial password (12+ characters)
          <input
            type="password"
            value={password}
            required
            minLength={12}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="outline">Add agronomist</button>
      </form>
      <h3>Workspace preferences</h3>
      <details>
        <summary>Define a region and its geographical bounds</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            const label = String(f.label);
            try {
              await api("regions", {
                method: "POST",
                body: JSON.stringify({
                  ...f,
                  id: label
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                }),
              });
              setMessage("Region saved. Reload the workspace to select it.");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <label>
            Region name
            <input name="label" required placeholder="Lagos, Nigeria" />
          </label>
          {["west", "south", "east", "north"].map((direction) => (
            <label key={direction}>
              {direction} boundary (degrees)
              <input
                name={direction}
                required
                type="number"
                step="any"
                min={["west", "east"].includes(direction) ? -180 : -90}
                max={["west", "east"].includes(direction) ? 180 : 90}
              />
            </label>
          ))}
          <button className="outline">Save region</button>
        </form>
      </details>
      <form
        key={
          settings
            ? JSON.stringify(settings.preferences)
            : "preferences-loading"
        }
        onSubmit={async (e) => {
          e.preventDefault();
          const fields = new FormData(e.currentTarget);
          try {
            await api("settings/preferences", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(fields)),
            });
            document.documentElement.dataset.density = String(
              fields.get("density") || "comfortable",
            );
            window.dispatchEvent(new Event("agro-preferences"));
            setMessage("Preferences saved.");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <label>
          Region
          <select
            name="region"
            defaultValue={settings?.preferences?.region || "kaduna"}
          >
            {regionCatalog.map(({ id, label }) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wind alert threshold (km/h)
          <input
            type="number"
            min="5"
            max="100"
            name="wind_threshold"
            defaultValue={settings?.wind_threshold || 20}
          />
        </label>
        <label>
          Currency
          <select
            name="currency"
            defaultValue={settings?.preferences?.currency || "USD"}
          >
            <option>USD</option>
            <option>NGN</option>
          </select>
        </label>
        <label>
          Units
          <select
            name="units"
            defaultValue={settings?.preferences?.units || "metric"}
          >
            <option value="metric">Celsius · km/h</option>
            <option value="imperial">Fahrenheit · mph</option>
          </select>
        </label>
        <label>
          Table density
          <select
            name="density"
            defaultValue={settings?.preferences?.density || "comfortable"}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <label>
          Data saver
          <select
            name="data_saver"
            defaultValue={String(settings?.preferences?.data_saver ?? true)}
          >
            <option value="true">On · smaller capture payloads</option>
            <option value="false">Off · standard capture payloads</option>
          </select>
        </label>
        <button className="outline">Save preferences</button>
      </form>
      <button
        className="outline"
        onClick={async () => {
          try {
            const r = await api("jobs/recheck", { method: "POST" });
            setMessage(
              `${r.checked} plans checked; ${r.invalidated} invalidated.`,
            );
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        Check weather shifts now
      </button>
      {message && (
        <p role="status" style={{ marginTop: 20 }}>
          {message}
        </p>
      )}
    </section>
  );
}

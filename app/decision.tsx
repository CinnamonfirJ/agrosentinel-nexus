"use client";
import { useState, useEffect } from "react";
import type { Scan, Receipt } from "../shared/contracts";
import { api } from "./client";
export function DecisionView({
  scan,
  onRefresh,
}: {
  scan: Scan;
  onRefresh?: () => void;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [units, setUnits] = useState("metric");
  useEffect(() => {
    api("settings")
      .then((s) => setUnits(s.preferences.units || "metric"))
      .catch(() => {});
  }, []);
  const p = scan.result;
  const weather = (p?.weather as { current?: Record<string, any> } | null)
    ?.current;
  if (!p)
    return (
      <div className="field-result">
        <h2>{scan.status.replaceAll("_", " ")}</h2>
        <p>
          {scan.error ||
            "Capture is safely stored. Analysis starts when required services are connected."}
        </p>
        {["failed", "awaiting_services", "invalidated"].includes(
          scan.status,
        ) && (
          <button
            className="outline"
            onClick={async () => {
              try {
                await api("scans/" + scan.id + "/retry", { method: "POST" });
                onRefresh?.();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Retry analysis
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    );
  async function source(id: string) {
    try {
      setReceipt(await api("sources/" + id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const shareText = [
    p.verdict,
    p.rationale,
    ...p.steps.map((s, i) => i + 1 + ". " + s.action),
    "Sources:",
    ...(scan.sources || []).map((s) => s.url),
  ].join("\n");
  return (
    <>
      <div className="field-result">
        <div className="eyebrow">
          VISUAL HYPOTHESIS · {Math.round(p.diagnosis.confidence * 100)}% MODEL
          CONFIDENCE
        </div>
        <h1>{p.diagnosis.disease}</h1>
        <div
          className="warning-banner"
          role={scan.status === "invalidated" ? "alert" : "status"}
        >
          <h2>
            {scan.status === "invalidated"
              ? "Weather changed. Do not apply this old plan."
              : p.verdict}
          </h2>
        </div>
        <p>{p.rationale}</p>
        {weather && (
          <section className="field-result">
            <h3>Reported weather conditions</h3>
            <p>
              {units === "imperial"
                ? `${((weather.temperature_2m * 9) / 5 + 32).toFixed(1)} °F · ${(weather.wind_speed_10m / 1.609344).toFixed(1)} mph wind`
                : `${weather.temperature_2m} °C · ${weather.wind_speed_10m} km/h wind`}
            </p>
            <small>{weather.time} UTC · numerical forecast</small>
            <button
              className="source"
              onClick={() => {
                const receipt = scan.sources?.find(
                  (s) => s.provider === "Open-Meteo",
                );
                if (receipt) setReceipt(receipt);
              }}
            >
              Open-Meteo source ↗
            </button>
          </section>
        )}
        {!p.grounded && (
          <p className="warning-banner">
            Not fully grounded against live weather and prices. Review missing
            evidence below.
          </p>
        )}
        <ol>
          {p.steps.map((s, i) => (
            <li key={i} style={{ margin: "16px 0", lineHeight: 1.6 }}>
              {s.action}
              {s.source_ids.map((id) => (
                <button className="source" key={id} onClick={() => source(id)}>
                  Source ↗
                </button>
              ))}
            </li>
          ))}
        </ol>
        {p.warnings.map((w, i) => (
          <p key={i}>{w}</p>
        ))}
        <p className="mono">
          Triage: {p.diagnosis.model}
          <br />
          Plan: {p.model}
        </p>
        <small>
          Analyzed {new Date(p.created * 1000).toLocaleString()} · {scan.status}
        </small>
        <details>
          <summary>
            Agent activity · {scan.events?.length || 0} audit events
          </summary>
          {scan.events?.map((e) => (
            <p key={e.id} className="mono">
              {new Date(e.created * 1000).toLocaleTimeString()} ·{" "}
              {String(e.payload.message || e.payload.query || e.kind)}
            </p>
          ))}
        </details>
        {(scan.sources || []).map((s) => (
          <button key={s.id} className="source" onClick={() => setReceipt(s)}>
            {s.provider} · {s.kind} ↗
          </button>
        ))}
        {receipt && (
          <section className="warning-banner">
            <button className="outline" onClick={() => setReceipt(null)}>
              Close receipt
            </button>
            <h3>{receipt.title}</h3>
            <p>{receipt.query}</p>
            <small>{new Date(receipt.retrieved * 1000).toLocaleString()}</small>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {receipt.content}
            </p>
            <a
              className="text-button"
              href={receipt.url}
              target="_blank"
              rel="noreferrer"
            >
              Open original source ↗
            </a>
          </section>
        )}
        <button
          className="primary"
          onClick={async () => {
            try {
              const { cachePut } = await import("./offline-store");
              await cachePut("plan-" + scan.id, scan);
              setSaved(true);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {saved ? "✓ Saved for offline" : "Save plan offline"}
        </button>
        <button
          className="outline"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: "AgroSentinel field plan",
                  text: shareText,
                });
              else await navigator.clipboard.writeText(shareText);
            } catch (e) {
              if ((e as Error).name !== "AbortError")
                setError((e as Error).message);
            }
          }}
        >
          Share plan
        </button>
        {scan.status === "invalidated" && (
          <button
            className="outline"
            onClick={async () => {
              try {
                await api("scans/" + scan.id + "/retry", { method: "POST" });
                onRefresh?.();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Request updated analysis
          </button>
        )}
        <h3>Cost comparison</h3>
        {p.economics && (
          <p>
            {p.economics.currency} {p.economics.default_cost} default −{" "}
            {p.economics.plan_cost} plan = {p.economics.saving} estimated
            saving. {p.economics.method}
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api("scans/" + scan.id + "/economics", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(f)),
              });
              onRefresh?.();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            Default treatment cost
            <input
              required
              min="0"
              step="0.01"
              type="number"
              name="default_cost"
            />
          </label>
          <label>
            Plan cost
            <input
              required
              min="0"
              step="0.01"
              type="number"
              name="plan_cost"
            />
          </label>
          <label>
            Currency
            <select name="currency">
              <option>USD</option>
              <option>NGN</option>
            </select>
          </label>
          <button className="outline">Save cost estimate</button>
        </form>
        {error && <p role="alert">{error}</p>}
      </div>
      {scan.revision_id && (
        <a className="primary" href={"/field?scan=" + scan.revision_id}>
          View updated plan / analysis ↗
        </a>
      )}
    </>
  );
}

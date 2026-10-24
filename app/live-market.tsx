"use client";
import { useState, useEffect } from "react";
import { api } from "./client";
import type { Receipt, Scan } from "../shared/contracts";
export function Market({
  region,
  onSource,
}: {
  region: string;
  onSource: (id?: string) => void;
}) {
  const [tab, setTab] = useState("Price"),
    [rows, setRows] = useState<Receipt[]>([]),
    [quotes, setQuotes] = useState<any[]>([]),
    [conflicts, setConflicts] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const response = await api("market?region=" + region);
      setRows(response.sources);
      setQuotes(response.quotes);
      setConflicts(response.conflicts);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [region]);
  async function refresh() {
    setBusy(true);
    try {
      const scans = await api<Scan[]>("scans");
      const scan = scans.find((s) => s.region === region);
      if (!scan)
        throw new Error(
          "Capture a leaf in this region first to anchor the query and evidence audit.",
        );
      await api("market/refresh", {
        method: "POST",
        body: JSON.stringify({ scan_id: scan.id }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const text =
      "Title,Query,Excerpt,Source,Retrieved\n" +
      rows
        .filter((r) => r.kind === tab)
        .map((r) =>
          [
            r.title,
            r.query,
            r.content,
            r.url,
            new Date(r.retrieved * 1000).toISOString(),
          ]
            .map((v) => '"' + v.replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "market-evidence.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <section className="ledger-hero">
        <div className="eyebrow">SOURCE-AWARE PROCUREMENT</div>
        <h2>Price is only half the story.</h2>
        <p>
          Retrieved commodity and supplier evidence. Read source units,
          currencies and publication dates before comparing quotes.
        </p>
      </section>
      <div className="table-tools">
        <div className="segmented">
          {["Price", "Availability"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "Price" ? "Commodity prices" : "Inputs availability"}
            </button>
          ))}
        </div>
        <button className="outline" disabled={busy} onClick={refresh}>
          {busy ? "Retrieving…" : "Refresh from Tavily"}
        </button>
        <button className="outline" onClick={download}>
          Export evidence CSV
        </button>
      </div>
      {error && (
        <p className="warning-banner" role="alert">
          {error}
        </p>
      )}
      {conflicts.map((conflict, i) => (
        <details key={i} className="warning-banner">
          <summary>Conflicting quotes · {conflict.item}</summary>
          <p>
            {conflict.method}: {conflict.conservative.price_text} /{" "}
            {conflict.unit}
          </p>
          {conflict.quotes.map((q: any, j: number) => (
            <p key={j}>
              {q.supplier}: {q.price_text} / {q.unit}{" "}
              <button className="source" onClick={() => onSource(q.source_id)}>
                Why this quote? ↗
              </button>
            </p>
          ))}
        </details>
      ))}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "ITEM",
                "QUOTED PRICE",
                "UNIT / CURRENCY",
                "SUPPLIER",
                "SOURCE",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes
              .filter((q) => q.kind === tab)
              .map((q, i) => (
                <tr key={i}>
                  <td>{q.item}</td>
                  <td className="mono">{q.price_text}</td>
                  <td>
                    {q.unit} · {q.currency}
                  </td>
                  <td>{q.supplier}</td>
                  <td>
                    <button
                      className="source"
                      onClick={() => onSource(q.source_id)}
                    >
                      Exact source excerpt ↗
                    </button>
                    <small>
                      {new Date(q.retrieved * 1000).toLocaleString()}
                    </small>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!quotes.some((q) => q.kind === tab) && (
          <p className="empty">
            No exact price, unit and supplier quotes extracted yet. Retrieved
            evidence is shown below; missing numbers are never filled in.
          </p>
        )}
      </div>
      <h3>Retrieved source evidence</h3>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "ITEM / SOURCE",
                "REPORTED INFORMATION",
                "RECEIPT",
                "FRESHNESS",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.kind === tab)
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.title}
                    <small>{r.query}</small>
                  </td>
                  <td style={{ maxWidth: 450, whiteSpace: "pre-wrap" }}>
                    {r.content}
                  </td>
                  <td>
                    <button className="source" onClick={() => onSource(r.id)}>
                      {r.provider} ↗
                    </button>
                  </td>
                  <td>
                    {Date.now() / 1000 - r.retrieved > 21600 ? "Stale · " : ""}
                    {new Date(r.retrieved * 1000).toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!rows.some((r) => r.kind === tab) && (
          <p className="empty">
            No retrieved {tab.toLowerCase()} evidence for this region. Run a
            grounded scan or refresh a captured scan.
          </p>
        )}
      </div>
      <p className="method">
        Retrieved pages can conflict or contain historical prices. No price or
        stock status is invented when sources are missing. Currency and quantity
        units must match before a conservative comparison is meaningful.
      </p>
    </>
  );
}

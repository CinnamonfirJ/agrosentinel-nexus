"use client";
import { AlertDiff } from "../alert-diff";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Camera, ArrowLeft, WifiOff, Check, Loader2 } from "lucide-react";
import { api } from "../client";
import { Filament } from "../filament";
import { DecisionView } from "../decision";
import {
  captures,
  saveCapture,
  removeCapture,
  syncCaptures,
  cacheGet,
  cachePut,
  type LocalCapture,
} from "../offline-store";
import type { Member, Scan } from "../../shared/contracts";
export default function LiveField() {
  const [me, setMe] = useState<Member | null>(null),
    [step, setStep] = useState("home"),
    [offline, setOffline] = useState(false),
    [region, setRegion] = useState("kaduna"),
    [crop, setCrop] = useState("Tomato"),
    [note, setNote] = useState(""),
    [image, setImage] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [location, setLocation] = useState<{ lat: number; lon: number } | null>(
      null,
    ),
    [queue, setQueue] = useState<LocalCapture[]>([]),
    [history, setHistory] = useState<Scan[]>([]),
    [selected, setSelected] = useState<Scan | null>(null),
    [advisory, setAdvisory] = useState<any>(null),
    [alerts, setAlerts] = useState<any[]>([]),
    [assignments, setAssignments] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const syncing = useRef(false);
  const [dataSaver, setDataSaver] = useState(true);
  useEffect(() => {
    api("settings")
      .then((s) => {
        setDataSaver(s.preferences.data_saver ?? true);
        if (s.preferences.region) setRegion(s.preferences.region);
      })
      .catch(() => {});
  }, []);
  const [regionCatalog, setRegionCatalog] = useState<
    { id: string; label: string }[]
  >([{ id: "kaduna", label: "Kaduna, Nigeria" }]);
  useEffect(() => {
    api("regions")
      .then(async (list) => {
        setRegionCatalog(list);
        await cachePut("region-catalog", list);
      })
      .catch(async () => {
        const list =
          await cacheGet<{ id: string; label: string }[]>("region-catalog");
        if (list) setRegionCatalog(list);
      });
  }, []);
  const refresh = useCallback(async () => {
    try {
      const user = await api<Member>("auth/me");
      setMe(user);
      await cachePut("current-user", user);
      const items = await api<Scan[]>("scans");
      setHistory(items);
      await cachePut("history-" + user.id, items.slice(0, 5));
      setAlerts(await api("alerts"));
      const tasks = await api("assignments");
      setAssignments(tasks);
      await cachePut("assignments-" + user.id, tasks);
      setOffline(false);
    } catch (e) {
      setOffline(true);
      if (navigator.onLine) setError((e as Error).message);
      const user = await cacheGet<Member>("current-user");
      if (user) {
        setMe(user);
        setHistory((await cacheGet<Scan[]>("history-" + user.id)) || []);
        setAssignments((await cacheGet<any[]>("assignments-" + user.id)) || []);
      }
    }
    setQueue(await captures());
  }, []);
  useEffect(() => {
    void refresh();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    function online() {
      void synchronize();
    }
    function off() {
      setOffline(true);
    }
    window.addEventListener("online", online);
    window.addEventListener("offline", off);
    const timer = setInterval(() => {
      if (navigator.onLine) void synchronize();
    }, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);
  useEffect(() => {
    api("advisory?region=" + region)
      .then(async (a) => {
        setAdvisory(a);
        await cachePut("advisory-" + region, a);
      })
      .catch(async () => setAdvisory(await cacheGet("advisory-" + region)));
  }, [region]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("scan");
    if (id) void openScan(id);
  }, []);
  useEffect(() => {
    if (
      !selected ||
      !["queued", "analyzing", "awaiting_services"].includes(selected.status)
    )
      return;
    const timer = setInterval(
      () => void openScan(selected.id, false),
      selected.status === "awaiting_services" ? 15000 : 2000,
    );
    return () => clearInterval(timer);
  }, [selected?.id, selected?.status]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function synchronize() {
    if (syncing.current) return;
    syncing.current = true;
    try {
      await syncCaptures();
      await refresh();
    } finally {
      syncing.current = false;
    }
  }
  async function openScan(id: string, changeStep = true) {
    try {
      const scan = await api<Scan>("scans/" + id);
      setSelected(scan);
      await cachePut("plan-" + id, scan);
      if (changeStep) setStep("detail");
    } catch (e) {
      const cached = await cacheGet<Scan>("plan-" + id);
      if (cached) {
        setSelected(cached);
        if (changeStep) setStep("detail");
      } else setError((e as Error).message);
    }
  }
  async function importImage(file: File) {
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(
        1,
        (dataSaver ? 768 : 1024) / Math.max(bitmap.width, bitmap.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Image compression failed")),
          "image/jpeg",
          dataSaver ? 0.45 : 0.6,
        ),
      );
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
      setStep("review");
    } catch {
      setError("Could not read this photo. Choose a JPEG, PNG or WebP image.");
    }
  }
  async function submit() {
    if (!image || !me) return;
    setBusy(true);
    setError("");
    try {
      const item: LocalCapture = {
        id: Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join(""),
        ownerId: me.id,
        blob: image,
        crop,
        note,
        region,
        created: Date.now(),
        attempts: 0,
        ...location,
      };
      await saveCapture(item);
      if (navigator.onLine) await syncCaptures();
      const updated = (await captures()).find((c) => c.id === item.id);
      if (updated?.serverId) await openScan(updated.serverId);
      else setStep("queue");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="field-stage">
      <div className="field-page">
        <div className="field-top">
          <Link href="/dashboard">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <span className="demo-badge">FIELD WORKSPACE</span>
        </div>
        {offline && (
          <div className="offline-banner">
            <WifiOff size={20} />
            Offline · showing cached records. Captures remain on this device.
          </div>
        )}
        {error && (
          <p className="warning-banner" role="alert">
            {error}
            <button className="outline" onClick={() => refresh()}>
              Retry
            </button>
          </p>
        )}
        {!me ? (
          <>
            <h1>Connect your workspace.</h1>
            <p>Sign in once before capturing and queueing field records.</p>
            <Link className="primary" href="/login?next=/field">
              Sign in
            </Link>
          </>
        ) : step === "home" ? (
          <>
            <h1>Your field, in focus.</h1>
            <label>
              Region
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regionCatalog.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <section className="advisory">
              <Filament tone="dark" layout="band" seed={3} density={350} />
              <div className="eyebrow">
                REGIONAL ADVISORY{offline ? " · CACHED" : ""}
              </div>
              <h2>{advisory?.title || "No analyzed regional evidence yet."}</h2>
              <small>
                {advisory?.updated
                  ? "Updated " +
                    new Date(advisory.updated * 1000).toLocaleString()
                  : "Awaiting first grounded scan"}
              </small>
              {advisory?.sources?.map((source: any) => (
                <a key={source.id} className="source" href={source.url} target="_blank" rel="noreferrer">
                  {source.title} · {source.provider} · {new Date(source.retrieved * 1000).toLocaleString()} ↗
                </a>
              ))}
              {advisory?.scan_id && (
                <button
                  className="source"
                  onClick={() => openScan(advisory.scan_id)}
                >
                  View evidence ↗
                </button>
              )}
            </section>
            {assignments.filter((a) => a.status !== "completed").map((a) => (
              <div key={a.id} className="warning-banner">
                <b>Field inspection · {a.region}</b>
                <p>{a.cluster_key.split(":").join(" · ")}</p>
                <p>{a.note || "Inspect the assigned area and capture a new leaf sample."}</p>
                <small>{a.status} · {new Date(a.created * 1000).toLocaleString()}</small>
                <button className="primary" disabled={offline} onClick={async () => {
                  try {
                    await api("assignments/" + a.id + "/status", {method:"POST", body:JSON.stringify({status:a.status === "assigned" ? "accepted" : "completed"})});
                    await refresh();
                  } catch (e) { setError((e as Error).message); }
                }}>{a.status === "assigned" ? "Accept inspection" : "Mark inspection complete"}</button>
              </div>
            ))}
            {alerts
              .filter((a) => !a.acknowledged)
              .map((a) => (
                <div key={a.id} className="warning-banner">
                  <b>{a.title}</b>
                  <p>{a.body}</p>
                  <AlertDiff alert={a} />
                  {a.scan_id && (
                    <button onClick={() => openScan(a.scan_id)}>
                      View plan
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await api("alerts/" + a.id + "/acknowledge", {
                          method: "POST",
                        });
                        await refresh();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            <button className="primary" onClick={() => setStep("capture")}>
              <Camera size={20} />
              Scan a leaf
            </button>
            <button className="outline" onClick={() => setStep("queue")}>
              Sync queue ·{" "}
              {queue.filter((c) => c.ownerId === me.id && !c.serverId).length}{" "}
              pending
            </button>
            <h3>Recent scans</h3>
            {history.map((s) => (
              <button
                className="field-history"
                style={{ display: "block", width: "100%", textAlign: "left" }}
                key={s.id}
                onClick={() => openScan(s.id)}
              >
                <b>
                  {s.crop} ·{" "}
                  {s.result?.diagnosis.disease || s.status.replaceAll("_", " ")}
                </b>
                <small>
                  {new Date(s.created * 1000).toLocaleString()} · {s.status}
                </small>
              </button>
            ))}
            {!history.length && (
              <p>
                No scans yet. Your last five plans are cached for offline use.
              </p>
            )}
          </>
        ) : step === "capture" ? (
          <>
            <h1>Frame the leaf.</h1>
            <p>
              Use daylight. Fill the frame with one leaf and keep the affected
              area sharp.
            </p>
            <label className="upload-label">
              <Camera size={40} />
              Take or choose a leaf photo
              <input
                aria-label="Leaf photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importImage(f);
                }}
              />
            </label>
            <button className="text-button" onClick={() => setStep("home")}>
              Cancel
            </button>
          </>
        ) : step === "review" ? (
          <>
            <h1>Review your specimen.</h1>
            <img
              src={preview}
              className="leaf-preview"
              alt="Your leaf specimen"
            />
            <small>1024px maximum · JPEG quality 0.6</small>
            <label>
              Crop
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>
                {[
                  "Tomato",
                  "Maize",
                  "Wheat",
                  "Rice",
                  "Coffee",
                  "Cassava",
                  "Sorghum",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Field note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
              />
            </label>
            <button
              className="outline"
              onClick={() => {
                if (!navigator.geolocation) {
                  setError("Location is unavailable on this device.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (p) =>
                    setLocation({
                      lat: p.coords.latitude,
                      lon: p.coords.longitude,
                    }),
                  (e) => setError(e.message),
                  { enableHighAccuracy: true, timeout: 15000 },
                );
              }}
            >
              {location
                ? `Location attached · ${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`
                : "Attach GPS location for weather & regional map"}
            </button>
            <button disabled={busy} className="primary" onClick={submit}>
              {busy ? <Loader2 className="spin" /> : <Check size={18} />}Save
              and analyze
            </button>
            <button className="text-button" onClick={() => setStep("capture")}>
              Retake
            </button>
          </>
        ) : step === "queue" ? (
          <>
            <h1>Sync queue.</h1>
            <p>
              Photos are durably saved on this device. Upload retries stop after
              three failures so you can review the problem.
            </p>
            <button
              className="primary"
              disabled={offline}
              onClick={() => synchronize()}
            >
              Sync now
            </button>
            {queue
              .filter((c) => c.ownerId === me.id)
              .map((c) => (
                <div className="field-result" key={c.id}>
                  <b>
                    {c.crop} · {c.serverId ? "Uploaded" : "Waiting to upload"}
                  </b>
                  <p>{c.error || `${c.attempts} upload attempts`}</p>
                  {c.serverId ? (
                    <button
                      className="outline"
                      onClick={() => openScan(c.serverId!)}
                    >
                      View record
                    </button>
                  ) : (
                    <>
                      <button
                        className="outline"
                        onClick={async () => {
                          await saveCapture({
                            ...c,
                            attempts: 0,
                            error: undefined,
                          });
                          await synchronize();
                        }}
                      >
                        Retry
                      </button>
                      <button
                        className="text-button"
                        onClick={async () => {
                          if (
                            confirm(
                              "Discard this queued photo from this device?",
                            )
                          ) {
                            await removeCapture(c.id);
                            await refresh();
                          }
                        }}
                      >
                        Discard
                      </button>
                    </>
                  )}
                </div>
              ))}
            <button className="text-button" onClick={() => setStep("home")}>
              Back to field home
            </button>
          </>
        ) : selected ? (
          <>
            <button className="text-button" onClick={() => setStep("home")}>
              Back to field home
            </button>
            {["queued", "analyzing"].includes(selected.status) && (
              <div className="analyzing">
                <div className="an-leaf">
                  <Filament layout="panel" seed={5} density={500} />
                  <img alt="Captured specimen" src={selected.image_url} />
                </div>
                <ol className="an-steps">
                  {[
                    "Visual triage",
                    "Tavily weather & market grounding",
                    "Evidence-linked decision",
                  ].map((label, i) => (
                    <li
                      className={
                        selected.stage > i
                          ? "done"
                          : selected.stage === i
                            ? "running"
                            : ""
                      }
                      key={label}
                    >
                      <span className="an-icon">
                        {selected.stage > i ? (
                          <Check size={14} />
                        ) : (
                          <Loader2
                            size={14}
                            className={selected.stage === i ? "spin" : ""}
                          />
                        )}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ol>
                <p>
                  Progress reflects actual backend execution. You can leave this
                  screen.
                </p>
              </div>
            )}
            <DecisionView
              scan={selected}
              onRefresh={() => openScan(selected.id, false)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

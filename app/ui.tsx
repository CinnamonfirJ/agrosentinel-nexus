"use client";
import { AlertDiff } from "./alert-diff";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sprout,
  LayoutDashboard,
  BookOpen,
  ChartNoAxesCombined,
  Activity,
  Settings,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  MapPin,
  Layers,
  Plus,
  Minus,
  Wind,
  CloudRain,
  Globe,
  Check,
  X,
  Search,
  Download,
  Leaf,
  Camera,
  Clock,
  ShieldCheck,
  LocateFixed,
  LogOut,
} from "lucide-react";
import { regions, money, type Cluster, type Region } from "./regions";
import { Market } from "./live-market";
import { DecisionView } from "./decision";
import {
  gsap,
  SplitText,
  Draggable,
  useGSAP,
  countUp,
  reducedMotion,
} from "./motion";

import { api, useWorkspace } from "./client";
import { ServiceSettings } from "./service-settings";
import { LiveMap } from "./live-map";
import type { Receipt, Scan } from "../shared/contracts";

const nav = [
  ["Overview", LayoutDashboard],
  ["Grounding ledger", BookOpen],
  ["Market & inputs", ChartNoAxesCombined],
  ["Agent activity", Activity],
  ["Settings", Settings],
] as const;

function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brandmark">
        <Sprout size={25} />
      </span>
      <span>
        agrosentinel<span className="nexus">NEXUS</span>
      </span>
    </Link>
  );
}

export function Source({
  label = "Tavily · weather",
  onOpen,
}: {
  label?: string;
  onOpen: () => void;
}) {
  return (
    <button className="source" onClick={onOpen}>
      <Globe size={12} />
      {label}
      <ArrowUpRight size={12} />
    </button>
  );
}

/** Segmented control with a thumb that slides between options. */
export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current!;
    const active = el.querySelector<HTMLElement>("button.active");
    const thumb = el.querySelector<HTMLElement>(".seg-thumb");
    if (!active || !thumb) return;
    const props = { x: active.offsetLeft - 3, width: active.offsetWidth };
    if (first.current || reducedMotion()) gsap.set(thumb, props);
    else
      gsap.to(thumb, { ...props, duration: 0.5, ease: "elastic.out(1, 0.75)" });
    first.current = false;
  }, [value]);
  return (
    <div className="segmented" ref={ref} role="group" aria-label={label}>
      <span className="seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o}
          aria-pressed={value === o}
          className={value === o ? "active" : ""}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Spark({ i = 0, k }: { i?: number; k: string }) {
  const ref = useRef<SVGPathElement>(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          duration: 1.4,
          ease: "power2.out",
          delay: 0.2 + i * 0.08,
        },
      );
    },
    { dependencies: [k] },
  );
  return (
    <svg
      className="spark"
      viewBox="0 0 110 35"
      aria-label="Illustrative trend, demo data"
      role="img"
    >
      <path
        ref={ref}
        d={
          [
            "M0 28L10 24 20 26 30 16 40 20 50 13 60 18 70 7 80 12 90 5 110 2",
            "M0 28L18 28 18 20 39 20 39 24 62 24 62 12 83 12 83 5 110 5",
          ][i % 2]
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Kpi({
  label,
  value,
  delta,
  foot,
  i,
  onClick,
}: {
  label: string;
  value: string;
  delta: string;
  foot: string;
  i: number;
  onClick: () => void;
}) {
  const num = useRef<HTMLSpanElement>(null);
  useGSAP(() => countUp(num.current!, value, 1.3, i * 0.08), {
    dependencies: [value],
  });
  return (
    <button className="kpi" onClick={onClick}>
      <span className="eyebrow">
        {label}
        <ArrowUpRight size={14} />
      </span>
      <div className="kpi-value">
        <span ref={num}>{value}</span>
        <span aria-hidden="true" />
      </div>
      <span className={i === 1 ? "delta caution" : "delta"}>
        {i === 1 ? "△" : "↗"} {delta}
      </span>
      <small>{foot}</small>
    </button>
  );
}

function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (reducedMotion()) return onClose();
    gsap
      .timeline({ onComplete: onClose })
      .to(ref.current, { xPercent: 100, duration: 0.45, ease: "power3.in" });
  }, [onClose]);
  useEffect(() => {
    const el = ref.current;
    const before = document.activeElement as HTMLElement;
    el?.showModal();
    const ctx = gsap.context(() => {});
    if (!reducedMotion()) {
      ctx.add(() =>
        gsap
          .timeline()
          .fromTo(
            el,
            { xPercent: 100 },
            { xPercent: 0, duration: 0.7, ease: "expo.out" },
          )
          .from(
            el!.querySelectorAll(".drawer-body > *"),
            { y: 24, autoAlpha: 0, stagger: 0.05, duration: 0.6 },
            0.15,
          ),
      );
    }
    return () => {
      ctx.revert();
      el?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="drawer-body">
        <div className="drawer-head">
          <span className="eyebrow">AUDIT & DETAIL</span>
          <button aria-label="Close panel" className="icon" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function ClusterPin({ c, onOpen }: { c: Cluster; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { scale: 0, autoAlpha: 0 },
      {
        scale: 1,
        autoAlpha: 1,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
        delay: c.id * 0.07,
      },
    );
  });
  return (
    <button
      ref={ref}
      className={`cluster level-${c.level}`}
      style={{ left: c.x + "%", top: c.y + "%" }}
      aria-label={`${c.disease}, ${c.count} detections, ${c.name}, ${c.country}`}
      onClick={onOpen}
    >
      <i className="pulse" aria-hidden="true" />
      <span>{c.count}</span>
      <small>{c.name}</small>
    </button>
  );
}

function MapView({
  region,
  time,
  onOpen,
}: {
  region: Region;
  time: number;
  onOpen: (c: Cluster) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const outline = useRef<SVGPathElement>(null);
  const zoom = useRef(1);
  const drag = useRef<Draggable | null>(null);
  const prevOutline = useRef(region.outline);

  const bounds = () => {
    const r = box.current!.getBoundingClientRect();
    const k = 0.25 + (zoom.current - 1) * 0.6;
    return {
      minX: -r.width * k,
      maxX: r.width * k,
      minY: -r.height * k,
      maxY: r.height * k,
    };
  };

  useGSAP(
    () => {
      drag.current = Draggable.create(stage.current, {
        type: "x,y",
        inertia: true,
        edgeResistance: 0.8,
        bounds: bounds(),
        cursor: "grab",
        activeCursor: "grabbing",
      })[0];
      return () => drag.current?.kill();
    },
    { scope: box },
  );

  // Morph the region outline and recenter when the region changes.
  useGSAP(
    () => {
      if (prevOutline.current === region.outline) return;
      prevOutline.current = region.outline;
      if (reducedMotion()) return;
      gsap.to(outline.current, {
        morphSVG: region.outline,
        duration: 1.1,
        ease: "settle",
      });
      zoom.current = 1;
      gsap.to(stage.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "settle",
      });
      gsap.from(".map-caption, .map-city", {
        autoAlpha: 0,
        y: 8,
        duration: 0.6,
        delay: 0.3,
      });
    },
    { dependencies: [region.id], scope: box },
  );

  const setZoom = (z: number) => {
    zoom.current = Math.min(1.8, Math.max(0.7, z));
    gsap.to(stage.current, {
      scale: zoom.current,
      duration: 0.6,
      ease: "settle",
    });
    if (drag.current) {
      drag.current.applyBounds(bounds());
    }
  };
  const recenter = () => {
    zoom.current = 1;
    gsap.to(stage.current, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "settle",
    });
  };

  const visible = region.clusters.filter((c) => time >= c.id * 3);
  return (
    <div
      className="map"
      ref={box}
      aria-label={`Illustrative outbreak map, ${region.label}, ${visible.length} clusters`}
    >
      <div className="map-stage" ref={stage}>
        <svg
          viewBox="0 0 800 550"
          preserveAspectRatio="none"
          className="basemap"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="grid"
              width="44"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M44 0H0V44"
                fill="none"
                stroke="#91aa95"
                strokeOpacity=".06"
              />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#2a5a43" stopOpacity=".55" />
              <stop offset="1" stopColor="#0e2a1f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect
            x="-400"
            y="-300"
            width="1600"
            height="1150"
            fill="url(#grid)"
          />
          <ellipse cx="400" cy="275" rx="420" ry="300" fill="url(#glow)" />
          <path
            ref={outline}
            d={region.outline}
            fill="#18372b"
            stroke="#65816a"
            strokeWidth="1.2"
          />
          <g fill="none" stroke="#61785e" strokeOpacity=".35">
            <path d="M259 43L269 160 162 206 54 238M269 160L408 40M269 160L405 206 488 20M405 206L560 74M405 206L514 295 681 213M514 295L689 353M514 295L540 520M514 295L356 358 344 529M356 358L126 318M162 206L242 301 138 482M242 301L356 358M405 206L356 358" />
          </g>
          <path
            className="river"
            d="M0 380C160 250 235 410 351 270S600 240 800 120M335 0C335 150 490 190 460 300S480 450 600 550"
            fill="none"
            stroke="#5e897a"
            strokeOpacity=".45"
            strokeWidth="2"
          />
          <path
            d="M180 0Q430 280 395 550M0 200Q400 120 800 430"
            fill="none"
            stroke="#a49c6e"
            strokeOpacity=".27"
            strokeDasharray="4 5"
          />
        </svg>
        <div className="map-content">
          {visible.map((c) => (
            <ClusterPin key={region.id + c.id} c={c} onOpen={() => onOpen(c)} />
          ))}
          <span
            className="map-city"
            style={{ left: region.hubAt[0] + "%", top: region.hubAt[1] + "%" }}
          >
            {region.hub} <span>◎</span>
          </span>
        </div>
      </div>
      <div className="map-caption">
        <span className="map-dot" /> {region.label.toUpperCase()}
        <small>SCHEMATIC · NOT FOR NAVIGATION</small>
      </div>
      {!visible.length && (
        <div className="map-empty">
          No detections in this region yet.
          <small>Widen the time window.</small>
        </div>
      )}
      <div className="map-zoom">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(zoom.current + 0.2)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(zoom.current - 0.2)}
        >
          <Minus size={18} />
        </button>
        <button aria-label="Recenter map" onClick={recenter}>
          <LocateFixed size={16} />
        </button>
      </div>
      <div className="legend">
        <span className="eyebrow">DETECTION INTENSITY</span>
        <div>
          {["Single", "Forming", "Active", "Spreading", "Severe"].map(
            (s, i) => (
              <span key={s}>
                <i className={"ember e" + i} />
                {s}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="map-scale">
        0 ━━━━━ 25 km <span>Illustrative boundaries · drag to pan</span>
      </div>
    </div>
  );
}

function PageBody({ children, k }: { children: React.ReactNode; k: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from(ref.current!.children, {
        y: 28,
        autoAlpha: 0,
        stagger: 0.07,
        duration: 0.8,
        clearProps: "transform,opacity,visibility",
      });
      gsap.from(ref.current!.querySelectorAll("tbody tr, .trace, .feed-item"), {
        x: -16,
        autoAlpha: 0,
        stagger: 0.05,
        duration: 0.6,
        delay: 0.25,
        clearProps: "transform,opacity,visibility",
      });
    },
    { scope: ref, dependencies: [k] },
  );
  return (
    <div className="page-body" ref={ref}>
      {children}
    </div>
  );
}

function LedgerHero({
  onSource,
  total,
  checks,
  currency,
}: {
  onSource: () => void;
  total: number;
  checks: number;
  currency: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const amount = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(total);
  useGSAP(() => countUp(ref.current!, amount, 1.8, 0.2), {
    dependencies: [total, currency],
  });
  return (
    <section className="ledger-hero">
      <div className="eyebrow">SAVED BY GROUNDED DECISIONS</div>
      <h2 ref={ref}>{amount}</h2>
      <p>{checks} evidence checks · estimated user-entered cost comparisons</p>
      <button className="text-button" onClick={onSource}>
        How savings are estimated <ArrowUpRight size={14} />
      </button>
    </section>
  );
}

export function Dashboard({
  initialWorkspace = null,
}: {
  initialWorkspace?: import("../shared/contracts").Workspace | null;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState("Overview"),
    [period, setPeriod] = useState("24h"),
    [regionId, setRegionId] = useState("kaduna"),
    [cluster, setCluster] = useState<Cluster | null>(null),
    [source, setSource] = useState(false),
    [list, setList] = useState(false),
    [time, setTime] = useState(24),
    [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [dispatch, setDispatch] = useState(false),
    [assigned, setAssigned] = useState<string[]>([]),
    [agent, setAgent] = useState("");
  const workspace = useWorkspace(regionId, period, initialWorkspace);
  const manager = workspace.me
    ? {
        name: workspace.me.name,
        initials: workspace.me.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2),
      }
    : { name: "Loading account", initials: "…" };
  const team = workspace.members;
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [detail, setDetail] = useState<Scan | null>(null);
  const [actionError, setActionError] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    const loadPreferences = () =>
      api("settings")
        .then((s) => {
          setCurrency(s.preferences.currency || "USD");
          if (s.preferences.region) setRegionId(s.preferences.region);
          document.documentElement.dataset.density =
            s.preferences.density || "comfortable";
        })
        .catch(() => {});
    void loadPreferences();
    window.addEventListener("agro-preferences", loadPreferences);
    return () =>
      window.removeEventListener("agro-preferences", loadPreferences);
  }, []);
  const [regionCatalog, setRegionCatalog] = useState<
    { id: string; label: string }[]
  >([{ id: "kaduna", label: "Kaduna, Nigeria" }, ...regions]);
  useEffect(() => {
    api("regions")
      .then(setRegionCatalog)
      .catch(() => {});
  }, []);
  const [scanDetailId, setScanDetailId] = useState("");
  const staticRegion = regions.find((r) => r.id === regionId) || {
    ...regions[0],
    id: regionId,
    label: regionCatalog.find((r) => r.id === regionId)?.label || regionId,
    short: regionCatalog.find((r) => r.id === regionId)?.label || regionId,
    hub: "KADUNA",
    hubAt: [50, 50] as [number, number],
  };
  const totals = workspace.data?.kpis;
  const region: Region = {
    ...staticRegion,
    clusters: workspace.data?.clusters || [],
    kpi: {
      detections: [
        totals ? String(totals.detections) : "—",
        totals ? String(totals.detections) : "—",
        totals ? String(totals.detections) : "—",
      ],
      prevented: totals ? String(totals.prevented) : "—",
      saved: totals
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
          }).format(totals.savings[currency] ?? 0)
        : "—",
    },
  };
  const visible = region.clusters;
  const checks = workspace.data?.ledger || [];
  const rows = checks.filter(
    (c) =>
      (filter === "All" || c.type === filter) &&
      JSON.stringify(c).toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    api("alerts")
      .then(setAlerts)
      .catch(() => {});
    api("activity")
      .then(setActivity)
      .catch(() => {});
  }, [workspace.data?.updated]);
  useEffect(() => {
    if (cluster) {
      const item = workspace.data?.clusters.find((c) => c.id === cluster.id);
      if (item?.scan_ids[0])
        api<Scan>("scans/" + item.scan_ids[0])
          .then(setDetail)
          .catch((e) => setActionError(e.message));
    } else setDetail(null);
  }, [cluster, workspace.data?.updated]);
  useEffect(() => {
    if (!scanDetailId) return;
    api<Scan>("scans/" + scanDetailId)
      .then(setDetail)
      .catch((e) => setActionError(e.message));
  }, [scanDetailId]);
  async function showReceipt(id?: string) {
    setActiveReceipt(null);
    setSource(true);
    if (id)
      try {
        setActiveReceipt(await api<Receipt>("sources/" + id));
      } catch (e) {
        setActionError((e as Error).message);
      }
  }
  const open = (c: Cluster) => {
    setCluster(c);
    setDispatch(false);
  };

  // Entrance choreography.
  useGSAP(
    (_ctx, contextSafe) => {
      if (reducedMotion()) return;
      let alive = true;
      gsap
        .timeline()
        .from(".sidebar", { x: -40, autoAlpha: 0, duration: 0.8 })
        .from(
          ".sidebar nav button, .workspace, .sidebar-bottom > *",
          { x: -20, autoAlpha: 0, stagger: 0.05, duration: 0.6 },
          0.2,
        )
        .from(
          ".topbar > *",
          { y: -12, autoAlpha: 0, stagger: 0.08, duration: 0.6 },
          0.2,
        );
      document.fonts.ready.then(
        contextSafe!(() => {
          if (!alive) return;
          const s = SplitText.create(".page-head h1", {
            type: "lines",
            mask: "lines",
          });
          gsap.from(s.lines, {
            yPercent: 110,
            duration: 1,
            ease: "expo.out",
            delay: 0.2,
          });
        }),
      );
      return () => {
        alive = false;
      };
    },
    { scope: root },
  );

  // Sliding nav indicator.
  useLayoutEffect(() => {
    const navEl = root.current?.querySelector<HTMLElement>(".sidebar nav");
    const btn = navEl?.querySelector<HTMLElement>("button.selected");
    const ind = navEl?.querySelector<HTMLElement>(".nav-indicator");
    if (!navEl || !btn || !ind) return;
    const props = {
      x: btn.offsetLeft,
      y: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    };
    gsap.to(ind, {
      ...props,
      duration: reducedMotion() ? 0 : 0.55,
      ease: "elastic.out(1, 0.8)",
    });
  }, [page]);
  useEffect(() => {
    const onResize = () => {
      const navEl = root.current?.querySelector<HTMLElement>(".sidebar nav");
      const btn = navEl?.querySelector<HTMLElement>("button.selected");
      const ind = navEl?.querySelector<HTMLElement>(".nav-indicator");
      if (btn && ind)
        gsap.set(ind, {
          x: btn.offsetLeft,
          y: btn.offsetTop,
          width: btn.offsetWidth,
          height: btn.offsetHeight,
        });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function signOut() {
    await api("auth/logout", { method: "POST" });
    for (const key of Object.keys(localStorage))
      if (key.startsWith("agro-workspace-")) localStorage.removeItem(key);
    const { cachePut } = await import("./offline-store");
    await cachePut("current-user", null);
    if ("caches" in window)
      for (const key of await caches.keys())
        if (key.startsWith("agrosentinel-shell")) await caches.delete(key);
    router.push("/login");
  }
  function exportCSV() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          "Query,Result,Decision,Estimated saving,Currency,Data mode\n" +
            rows
              .map((r) =>
                [
                  r.query,
                  r.result,
                  r.impact,
                  r.saving ?? "Not estimated",
                  r.currency,
                  "LIVE RECORD",
                ]
                  .map((x) => '"' + String(x).replaceAll('"', '""') + '"')
                  .join(","),
              )
              .join("\n"),
        ],
        { type: "text/csv" },
      ),
    );
    a.download = "agrosentinel-ledger.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const kpis = [
    {
      label: `DETECTIONS · ${period.toUpperCase()}`,
      value:
        region.kpi.detections[period === "24h" ? 0 : period === "7d" ? 1 : 2],
      delta: "Recorded observations",
      foot: `${workspace.data?.scans.length ?? 0} captures in this time window`,
    },
    {
      label: "ACTIVE CLUSTERS",
      value: totals ? String(visible.length) : "—",
      delta: "Geographically aggregated",
      foot: "Source-linked observations · 10 km cells",
    },
    {
      label: "SPRAYS PREVENTED",
      value: region.kpi.prevented,
      delta: "Weather-informed decisions",
      foot: `${totals?.checks ?? 0} recorded checks`,
    },
    {
      label: "EST. SAVED THIS SEASON",
      value: region.kpi.saved,
      delta: "User-entered cost comparisons",
      foot: "View calculation in ledger",
    },
  ];

  return (
    <div className="shell" ref={root}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <span className="coop">{region.short[0]}</span>
          <div>
            {region.short} Cooperative<small>Regional workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="navlabel eyebrow">WORKSPACE</span>
        <nav>
          <span className="nav-indicator" aria-hidden="true" />
          {nav.map(([n, I]) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={page === n ? "selected" : ""}
              aria-current={page === n ? "page" : undefined}
            >
              <I size={19} />
              <span className="nav-text">{n}</span>
              {n === "Grounding ledger" && (
                <span className="count">{checks.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-note">
            <ShieldCheck size={22} />
            <b>Every decision, grounded.</b>
            <p>Trace every recommendation back to its source.</p>
            <Link href="/">
              Explore the project <ArrowUpRight size={13} />
            </Link>
          </div>
          <Link className="field-link" href="/field">
            <Camera size={17} /> Open field app <ArrowUpRight size={14} />
          </Link>
          <div className="profile">
            <span className="avatar">{manager.initials}</span>
            <div>
              {manager.name}
              <small>Cooperative manager</small>
            </div>
            <button className="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div className="body">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="slash">/</span>
            {page}
          </div>
          <div className="top-right">
            <span className="demo-badge">
              {workspace.online ? "CONNECTED" : "OFFLINE SNAPSHOT"}
            </span>
            <span className="connection">
              <span /> Snapshot available
            </span>
            <span className="avatar small">{manager.initials}</span>
          </div>
        </header>
        <main id="main">
          <div className="page-head">
            <div>
              <div className="eyebrow">YOUR REGION, IN FOCUS</div>
              <h1>{page === "Overview" ? "Regional overview" : page}</h1>
              <p>Clear signals. Grounded decisions. A more resilient season.</p>
            </div>
            <div className="head-controls">
              <label className="region">
                <MapPin size={15} />
                <select
                  aria-label="Region"
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                >
                  {regionCatalog.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <Segmented
                label="Time period"
                options={["24h", "7d", "Season"]}
                value={period}
                onChange={setPeriod}
              />
            </div>
          </div>
          <div className="snapshot">
            <Clock size={13} />{" "}
            {workspace.data
              ? "Updated " +
                new Date(workspace.data.updated * 1000).toLocaleString()
              : "Loading regional records…"}
            <span>
              Live records · photo-based hypotheses require field verification
            </span>
          </div>
          {(workspace.error || actionError) && (
            <p role="alert" className="warning-banner">
              {workspace.error || actionError}{" "}
              <button onClick={() => workspace.refresh()}>Retry</button>
            </p>
          )}
          {alerts
            .filter((a) => !a.acknowledged)
            .slice(0, 3)
            .map((a) => (
              <div className="warning-banner" key={a.id}>
                <b>{a.title}</b>
                <p>{a.body}</p>
                <AlertDiff alert={a} />
                <button
                  onClick={async () => {
                    await api("alerts/" + a.id + "/acknowledge", {
                      method: "POST",
                    });
                    setAlerts(
                      alerts.map((x) =>
                        x.id === a.id ? { ...x, acknowledged: 1 } : x,
                      ),
                    );
                  }}
                >
                  Acknowledge
                </button>
                {a.scan_id && (
                  <a href={"/field?scan=" + a.scan_id}>View plan</a>
                )}
              </div>
            ))}
          <PageBody k={page}>
            {page === "Overview" ? (
              <>
                <section className="kpis" aria-label="Regional indicators">
                  {kpis.map((k, i) => (
                    <Kpi
                      key={k.label}
                      {...k}
                      i={i}
                      onClick={() =>
                        i === 3 ? setPage("Grounding ledger") : setSource(true)
                      }
                    />
                  ))}
                </section>
                <div className="overview-grid">
                  <section className="map-panel panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Outbreak intelligence{" "}
                          <span className="tag">{visible.length} clusters</span>
                        </h2>
                        <p>Early signals. Before they spread.</p>
                      </div>
                      <button
                        className="outline"
                        onClick={() => setList(!list)}
                      >
                        <Layers size={14} />
                        {list ? "View map" : "View as list"}
                      </button>
                    </div>
                    {list ? (
                      <div className="cluster-list">
                        {visible.map((c) => (
                          <button key={c.id} onClick={() => open(c)}>
                            <MapPin size={16} />
                            <b>{c.name}</b>
                            <span>{c.disease}</span>
                            <span>{c.count} detections</span>
                            <ArrowRight size={15} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <LiveMap
                        loading={!workspace.data}
                        bounds={workspace.data?.bounds}
                        clusters={(workspace.data?.clusters || []).filter((c) =>
                          (workspace.data?.scans || []).some(
                            (s) =>
                              c.scan_ids.includes(s.id) &&
                              s.created > Date.now() / 1000 - time * 3600,
                          ),
                        )}
                        region={regionId}
                        onOpen={open}
                      />
                    )}
                    <div className="scrubber">
                      <Clock size={15} />
                      <span>Past {time} hours</span>
                      <input
                        aria-label="Map time window in hours"
                        type="range"
                        min="3"
                        max="24"
                        value={time}
                        style={{
                          ["--fill" as string]: ((time - 3) / 21) * 100 + "%",
                        }}
                        onChange={(e) => setTime(+e.target.value)}
                      />
                      <span>Now</span>
                    </div>
                    <div className="map-footer">
                      <span>
                        <ShieldCheck size={13} /> Aggregated & anonymized field
                        scans
                      </span>
                      <button onClick={() => setSource(true)}>
                        View data provenance <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </section>
                  <aside className="right-column">
                    <section className="panel feed">
                      <div className="panel-heading">
                        <h2>Recent field captures</h2>
                        <span className="tag">Snapshot</span>
                      </div>
                      {(workspace.data?.scans || [])
                        .slice(0, 6)
                        .map((scan, i) => (
                          <a
                            className="feed-item"
                            key={scan.id}
                            href={"/field?scan=" + scan.id}
                          >
                            <span className={"leaf-icon leaf-" + (i % 4)}>
                              <Leaf size={19} />
                            </span>
                            <div>
                              <b>
                                {scan.result?.diagnosis.disease || scan.crop}
                              </b>
                              <p>
                                {scan.crop} · {scan.status.replaceAll("_", " ")}
                              </p>
                              <small>
                                {new Date(scan.created * 1000).toLocaleString()}
                              </small>
                            </div>
                            <ArrowUpRight size={14} />
                          </a>
                        ))}
                      {!workspace.data?.scans.length && (
                        <p className="empty">
                          No field captures in this time window. Scan a leaf to
                          begin.
                        </p>
                      )}
                      <button
                        className="panel-link"
                        onClick={() => setList(true)}
                      >
                        View all detections <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="ledger-card">
                      <div className="eyebrow">
                        <Globe size={14} /> TAVILY GROUNDING LEDGER
                      </div>
                      <h2>
                        Better evidence.
                        <br />
                        Better outcomes.
                      </h2>
                      <p>
                        Every check connects a source to a decision — and its
                        estimated impact.
                      </p>
                      {checks.slice(0, 2).map((c, i) => (
                        <button
                          className="saving-row"
                          key={c.query}
                          onClick={() => showReceipt(c.source_ids[0])}
                        >
                          <span>
                            {i === 0 ? (
                              <Wind size={16} />
                            ) : (
                              <CloudRain size={16} />
                            )}
                            <span>
                              {c.impact}
                              <small>{c.query}</small>
                            </span>
                          </span>
                          <b>
                            {c.saving === null
                              ? "Not estimated"
                              : new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: c.currency,
                                }).format(c.saving)}
                          </b>
                        </button>
                      ))}
                      <button
                        className="ledger-link"
                        onClick={() => setPage("Grounding ledger")}
                      >
                        Open grounding ledger <ArrowUpRight size={16} />
                      </button>
                    </section>
                  </aside>
                </div>
                <div className="bottom-note">
                  <span>
                    <ShieldCheck size={14} /> Intelligence you can trace.
                    Decisions you can stand behind.
                  </span>
                  <span>Nano triage → Tavily grounding → Ultra reasoning</span>
                </div>
              </>
            ) : page === "Market & inputs" ? (
              <Market region={regionId} onSource={showReceipt} />
            ) : page === "Grounding ledger" ? (
              <>
                <LedgerHero
                  total={totals?.savings[currency] ?? 0}
                  currency={currency}
                  checks={checks.length}
                  onSource={() => showReceipt()}
                />
                <div className="table-tools">
                  <Segmented
                    label="Check type"
                    options={["All", "Weather", "Price", "Availability"]}
                    value={filter}
                    onChange={setFilter}
                  />
                  <label className="search">
                    <Search size={16} />
                    <input
                      placeholder="Find a source or decision"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <button className="outline" onClick={exportCSV}>
                    <Download size={15} />
                    Export CSV
                  </button>
                </div>
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "CHECK / QUERY",
                          "RESULT",
                          "DECISION IMPACT",
                          "EST. SAVING",
                          "RECEIPT",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.query}>
                          <td>
                            <b>{c.query}</b>
                            <small>
                              {new Date(c.created * 1000).toLocaleString()}
                            </small>
                          </td>
                          <td>{c.result}</td>
                          <td>{c.impact}</td>
                          <td className="mono">
                            {c.saving === null
                              ? "Not estimated"
                              : new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: c.currency,
                                }).format(c.saving)}
                          </td>
                          <td>
                            <Source
                              label={
                                c.source_ids.length
                                  ? "Open source"
                                  : "Cost method"
                              }
                              onOpen={() => showReceipt(c.source_ids[0])}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!rows.length && (
                    <p className="empty">No checks match your filters.</p>
                  )}
                </div>
                <p className="method">
                  Savings compare user-entered default treatment costs with
                  alternative plan costs. They are estimates, not realized
                  financial returns.
                </p>
              </>
            ) : page === "Agent activity" ? (
              <section className="panel activity-panel">
                <div className="eyebrow">EXECUTION RECORD</div>
                <h2>From observation to decision.</h2>
                <p>
                  Actual tool events and decision summaries. Private model
                  reasoning is never exposed.
                </p>
                {activity.length ? (
                  activity.map((e) => (
                    <div className="trace" key={e.id}>
                      <span>
                        {new Date(e.created * 1000).toLocaleTimeString()}
                      </span>
                      <p>{e.payload.message || e.payload.query || e.kind}</p>
                      {e.payload.source_id && (
                        <Source
                          label="Receipt"
                          onOpen={() => showReceipt(e.payload.source_id)}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p>No agent runs yet. Capture a leaf to start.</p>
                )}
              </section>
            ) : (
              <ServiceSettings />
            )}
          </PageBody>
        </main>
        <footer>
          <Brand />
          <span>Grounded intelligence. Resilient agriculture.</span>
          <span>CONNECTED WORKSPACE · v1.0</span>
        </footer>
      </div>
      {cluster && (
        <Drawer
          title={`${cluster.disease} · ${cluster.name}`}
          onClose={() => setCluster(null)}
        >
          <div className="warning-banner">
            △ Photo-based observations · requires field verification
          </div>
          <div className="detail-number">
            {cluster.count}
            <small>
              anonymized detections · {cluster.crop} · {cluster.country}
            </small>
          </div>
          <h3>Decision summary</h3>
          <p>{detail?.result?.verdict || "Loading field decision…"}</p>
          <Source
            label="Decision evidence"
            onOpen={() => showReceipt(detail?.result?.source_ids[0])}
          />
          {detail && (
            <>
              <a className="text-button" href={"/field?scan=" + detail.id}>
                Open full plan and source receipts ↗
              </a>
            </>
          )}
          <h3>Affected captures</h3>
          {(workspace.data?.scans || [])
            .filter((s) =>
              workspace.data?.clusters
                .find((c) => c.id === cluster.id)
                ?.scan_ids.includes(s.id),
            )
            .map((s) => (
              <div className="detail-row" key={s.id}>
                <b>{s.id.slice(0, 8)}</b>
                <span>{s.crop}</span>
                <small>{s.status}</small>
              </div>
            ))}
          <details>
            <summary>Agent activity · 3 steps · Nano / Ultra</summary>
            <p className="mono">
              {detail?.events
                ?.map((e) => String(e.payload.message || e.kind))
                .join(" → ") || "Loading audit trail…"}
            </p>
          </details>
          {workspace.data?.assignments.some(
            (a) =>
              a.cluster_key ===
              workspace.data?.clusters.find((c) => c.id === cluster.id)?.key,
          ) || assigned.includes(region.id + cluster.id) ? (
            <p role="status" className="confirmation">
              <Check size={18} /> Inspection {workspace.data?.assignments.find((a) => a.cluster_key === workspace.data?.clusters.find((c) => c.id === cluster.id)?.key)?.status || "assigned"} · notification recorded
            </p>
          ) : dispatch ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (assigning) return;
                setAssigning(true);
                setActionError("");
                try {
                  const target = workspace.members.find(
                    (m) => m.id === (agent || team[0]?.id),
                  );
                  if (!target)
                    throw new Error("Choose a registered team member.");
                  await api("assignments", {
                    method: "POST",
                    body: JSON.stringify({
                      region: regionId,
                      cluster_key: workspace.data?.clusters.find(
                        (c) => c.id === cluster.id,
                      )?.key,
                      assignee: target.id,
                      note: assignmentNote,
                    }),
                  });
                  setAssigned([...assigned, region.id + cluster.id]);
                  await workspace.refresh();
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setAssigning(false);
                }
              }}
            >
              <label>
                Agronomist
                <select
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                >
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Field note
                <textarea
                  placeholder="Add an inspection note"
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                />
              </label>
              {actionError && <p role="alert" className="warning-banner">{actionError}</p>}
              <button className="primary" disabled={assigning || !team.length}>
                {assigning ? "Assigning…" : "Assign inspection"} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <button className="primary" onClick={() => setDispatch(true)}>
              Dispatch agronomist <ArrowRight size={16} />
            </button>
          )}
        </Drawer>
      )}
      {source && (
        <Drawer title="Source receipt" onClose={() => setSource(false)}>
          {activeReceipt ? (
            <>
              <h3>{activeReceipt.title}</h3>
              <dl>
                <dt>Query</dt>
                <dd>{activeReceipt.query}</dd>
                <dt>Provider</dt>
                <dd>{activeReceipt.provider}</dd>
                <dt>Retrieved</dt>
                <dd>
                  {new Date(activeReceipt.retrieved * 1000).toLocaleString()}
                </dd>
                <dt>Source excerpt</dt>
                <dd
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {activeReceipt.content}
                </dd>
              </dl>
              <a
                className="primary"
                href={activeReceipt.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open original source ↗
              </a>
            </>
          ) : (
            <>
              <h3>Evidence and estimation policy</h3>
              <p>
                Every external claim links to its retrieved source, query and
                timestamp. Visual findings identify their actual model. Savings
                are only calculated from explicit cost inputs; missing prices
                are never invented.
              </p>
              <p>
                {workspace.data?.scans.length ?? 0} captures · {checks.length}{" "}
                recorded checks.
              </p>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}

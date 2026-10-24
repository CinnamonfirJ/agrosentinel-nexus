"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Sprout,
  ArrowUpRight,
  Smartphone,
  Network,
  Map,
  Globe,
} from "lucide-react";
import {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  useGSAP,
  magnetic,
  reducedMotion,
} from "../motion";
import { Filament } from "../filament";
import { regions } from "../regions";

const features = [
  {
    n: "01 / THE EDGE",
    id: "edge",
    title: "The phone is the sensor.",
    body: "Capture a leaf in the field. Keep recent plans close, even when the signal is far away.",
    Icon: Smartphone,
  },
  {
    n: "02 / THE BRAIN",
    id: "brain",
    title: "Evidence before advice.",
    body: "Fast triage, external weather and market checks, then a decision with a receipt.",
    Icon: Network,
  },
  {
    n: "03 / THE BIG PICTURE",
    id: "macro",
    title: "A region, connected.",
    body: "See emerging clusters, coordinate inspections and follow the impact of each decision.",
    Icon: Map,
  },
];
const pipeline = [
  "Expo",
  "FastAPI",
  "Nemotron Nano",
  "Tavily",
  "Nemotron Ultra",
  "Next.js",
];

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="brand" href="/" onClick={onClick}>
      <span className="brandmark">
        <Sprout />
      </span>
      <span>
        agrosentinel<span className="nexus">NEXUS</span>
      </span>
    </Link>
  );
}

function Odometer({ value }: { value: string }) {
  return (
    <span className="odometer" aria-label={value}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="odo-col" key={i} aria-hidden="true">
            <span className="odo-strip" data-digit={ch}>
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span className="odo-static" key={i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function EdgeArt() {
  return (
    <svg viewBox="0 0 320 240" className="art art-edge" aria-hidden="true">
      <rect x="110" y="18" width="100" height="204" rx="18" className="phone" />
      <rect
        x="142"
        y="28"
        width="36"
        height="5"
        rx="2.5"
        className="phone-notch"
      />
      <path
        className="leaf"
        d="M160 70C122 96 120 150 160 190 200 150 198 96 160 70Z"
      />
      <path
        className="leaf-vein"
        d="M160 76V186M160 110L140 98M160 130L178 116M160 152L142 140M160 168L176 158"
      />
      <g className="brackets">
        <path d="M124 56v-12h12M196 56v-12h-12M124 196v12h12M196 196v12h-12" />
      </g>
      <rect className="scanline" x="122" y="60" width="76" height="2" rx="1" />
    </svg>
  );
}
function BrainArt() {
  return (
    <svg viewBox="0 0 320 240" className="art art-brain" aria-hidden="true">
      <path
        className="wire"
        d="M50 120C100 120 100 60 160 60S220 120 270 120"
      />
      <path
        className="wire"
        d="M50 120C100 120 100 180 160 180S220 120 270 120"
      />
      <path
        className="flow"
        d="M50 120C100 120 100 60 160 60S220 120 270 120"
      />
      <path
        className="flow f2"
        d="M50 120C100 120 100 180 160 180S220 120 270 120"
      />
      {[
        [50, 120, "NANO"],
        [160, 60, "TAVILY"],
        [160, 180, "TAVILY"],
        [270, 120, "ULTRA"],
      ].map(([x, y, l], i) => (
        <g key={i} className="node" transform={`translate(${x} ${y})`}>
          <circle r="22" />
          <circle r="5" className="core" />
          <text y="40" textAnchor="middle">
            {l}
          </text>
        </g>
      ))}
    </svg>
  );
}
function MacroArt() {
  // Abstract diagram positions, not disease observations.
  const c = [
    { id: 1, x: 30, y: 30, level: 3 },
    { id: 2, x: 58, y: 72, level: 2 },
    { id: 3, x: 42, y: 44, level: 4 },
    { id: 4, x: 18, y: 62, level: 2 },
    { id: 5, x: 76, y: 46, level: 3 },
  ];
  return (
    <svg viewBox="0 0 320 240" className="art art-macro" aria-hidden="true">
      <path
        className="land"
        d="M30 60L80 30 130 42 170 18 210 38 250 28 290 56 300 120 280 170 296 200 250 214 200 224 150 210 100 226 60 200 22 150 40 100Z"
      />
      {c.map((d) => (
        <g
          key={d.id}
          transform={`translate(${30 + d.x * 2.7} ${24 + d.y * 1.9})`}
        >
          <circle className={"ring l" + d.level} r={6 + d.level * 3} />
          <circle className={"dot l" + d.level} r={2.5 + d.level} />
        </g>
      ))}
    </svg>
  );
}

export function Landing() {
  const [liveStats, setLiveStats] = useState<any>(null);
  const [statsError, setStatsError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      fetch("/api/public/stats")
        .then(async (r) => {
          if (!r.ok) throw new Error("Statistics unavailable");
          const data = await r.json();
          if (alive) {
            setLiveStats(data);
            setStatsError("");
          }
        })
        .catch((e) => {
          if (alive) setStatsError(e.message);
        });
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  const stats = [
    { v: liveStats ? String(liveStats.scans) : "—", l: "analyzed captures" },
    { v: liveStats ? String(liveStats.checks) : "—", l: "retrieved sources" },
    { v: liveStats ? String(liveStats.decisions) : "—", l: "field decisions" },
    {
      v: liveStats ? "$" + Number(liveStats.savings.USD).toLocaleString() : "—",
      l: "estimated USD savings",
    },
  ];

  const root = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("agro-intro") === "1";
      sessionStorage.setItem("agro-intro", "1");
    } catch {}
    if (seen || reducedMotion()) {
      setShowLoader(false);
      setLoaded(true);
    }
  }, []);

  // Loader: ring draws, mark settles, curtain lifts.
  useGSAP(
    () => {
      if (!showLoader) return;
      const tl = gsap.timeline({
        onComplete: () => {
          setShowLoader(false);
        },
      });
      tl.from(".loader-ring", {
        drawSVG: "0%",
        duration: 1.1,
        ease: "power2.inOut",
      })
        .from(
          ".loader-mark",
          { scale: 0.4, autoAlpha: 0, duration: 0.6, ease: "back.out(2)" },
          0.35,
        )
        .to(
          ".loader-count",
          {
            textContent: 100,
            snap: { textContent: 1 },
            duration: 1.1,
            ease: "power2.inOut",
          },
          0,
        )
        .add(() => setLoaded(true), 1.1)
        .to(
          ".loader-inner",
          { yPercent: -40, autoAlpha: 0, duration: 0.6, ease: "power3.in" },
          1.15,
        )
        .to(
          ".loader",
          { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" },
          1.3,
        );
    },
    { scope: root, dependencies: [showLoader === true] },
  );

  // Page choreography.
  useGSAP(
    (_ctx, contextSafe) => {
      if (!loaded) return;
      let alive = true;
      const still = reducedMotion();
      let smoother: ScrollSmoother | undefined;
      if (!still && window.matchMedia("(pointer: fine)").matches) {
        smoother = ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 1.1,
          effects: true,
        });
      }

      const cleanups: (() => void)[] = [];
      root
        .current!.querySelectorAll<HTMLElement>("[data-magnetic]")
        .forEach((el) => cleanups.push(magnetic(el)));

      document.fonts.ready.then(
        contextSafe!(() => {
          if (!alive || still) return;
          // Hero: masked line reveal, like the reference's headline.
          const split = SplitText.create(".hero-title", {
            type: "lines",
            mask: "lines",
          });
          const intro = gsap.timeline({ delay: 0.05 });
          intro
            .from(".landing-nav > *", {
              y: -30,
              autoAlpha: 0,
              stagger: 0.08,
              duration: 0.8,
            })
            .from(".hero-eyebrow", { y: 16, autoAlpha: 0, duration: 0.6 }, 0.1)
            .from(
              split.lines,
              { yPercent: 110, duration: 1.2, stagger: 0.12, ease: "expo.out" },
              0.15,
            )
            .from(".hero-copy", { y: 24, autoAlpha: 0, duration: 0.9 }, 0.55)
            .from(
              ".hero-actions > *",
              { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.8 },
              0.7,
            )
            .from(
              ".hero-meta > *",
              { autoAlpha: 0, x: -12, stagger: 0.08, duration: 0.6 },
              0.9,
            );

          // Statement: words fill from grey to ink as you scroll, the reference's signature move.
          const words = SplitText.create(".statement-text", { type: "words" });
          gsap.fromTo(
            words.words,
            { color: "#C3C9C0" },
            {
              color: "#13211B",
              stagger: 0.1,
              ease: "none",
              scrollTrigger: {
                trigger: ".statement",
                start: "top 70%",
                end: "bottom 60%",
                scrub: true,
              },
            },
          );
          gsap.from(".float-chip", {
            scale: 0.6,
            autoAlpha: 0,
            stagger: 0.12,
            ease: "back.out(1.8)",
            scrollTrigger: { trigger: ".statement", start: "top 75%" },
          });

          // Section headings rise in.
          gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
            const s = SplitText.create(el, { type: "lines", mask: "lines" });
            gsap.from(s.lines, {
              yPercent: 105,
              stagger: 0.1,
              duration: 1,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 85%" },
            });
          });
        }),
      );

      // Horizontal story through the three numbered cards, pinned on desktop.
      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
        () => {
          const track = document.querySelector<HTMLElement>(".feature-track")!;
          const distance = () => track.scrollWidth - window.innerWidth + 80;
          const scroll = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: ".features",
              start: "top top",
              end: () => "+=" + (distance() + window.innerHeight * 0.6),
              pin: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
          gsap.from(".feature-card", {
            y: 80,
            autoAlpha: 0,
            stagger: 0.12,
            duration: 1.1,
            scrollTrigger: { trigger: ".features", start: "top 75%" },
          });
          gsap.to(".features-progress i", {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".features",
              start: "top top",
              end: () => "+=" + (distance() + window.innerHeight * 0.6),
              scrub: true,
            },
          });
        },
      );
      mm.add(
        "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card) =>
            gsap.from(card, {
              y: 60,
              autoAlpha: 0,
              scrollTrigger: { trigger: card, start: "top 88%" },
            }),
          );
        },
      );

      if (!still) {
        // Card illustrations loop quietly.
        gsap.to(".scanline", {
          y: 120,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".brackets", {
          scale: 1.06,
          transformOrigin: "50% 50%",
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.fromTo(
          ".flow",
          { drawSVG: "0% 0%" },
          {
            drawSVG: "100% 100%",
            duration: 2.2,
            repeat: -1,
            ease: "power1.inOut",
            stagger: 0.6,
          },
        );
        gsap.to(".node .core", {
          scale: 1.6,
          transformOrigin: "50% 50%",
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          stagger: 0.3,
          ease: "sine.inOut",
        });
        gsap.fromTo(
          ".art-macro .ring",
          { scale: 0.4, autoAlpha: 0.9, transformOrigin: "50% 50%" },
          {
            scale: 1.6,
            autoAlpha: 0,
            duration: 2.2,
            repeat: -1,
            stagger: { each: 0.35, from: "random" },
            ease: "power1.out",
          },
        );

        // Odometer stats roll into place.
        gsap.utils.toArray<HTMLElement>(".odo-strip").forEach((strip, i) => {
          const d = Number(strip.dataset.digit);
          gsap.fromTo(
            strip,
            { yPercent: 0 },
            {
              yPercent: -d * 10,
              duration: 1.8 + (i % 4) * 0.15,
              ease: "expo.out",
              scrollTrigger: { trigger: ".stats", start: "top 80%" },
            },
          );
        });
        gsap.from(".stat", {
          y: 40,
          autoAlpha: 0,
          stagger: 0.1,
          scrollTrigger: { trigger: ".stats", start: "top 80%" },
        });

        // Pipeline draws left to right.
        const pipe = gsap.timeline({
          scrollTrigger: { trigger: ".architecture", start: "top 75%" },
        });
        pipe
          .from(".pipe-line", {
            scaleX: 0,
            transformOrigin: "0 50%",
            duration: 1.6,
            ease: "power2.inOut",
          })
          .from(
            ".pipe-node",
            {
              y: 20,
              autoAlpha: 0,
              scale: 0.8,
              stagger: 0.14,
              ease: "back.out(2)",
              duration: 0.6,
            },
            0.1,
          );

        gsap.from(".cta-inner > *", {
          y: 50,
          autoAlpha: 0,
          stagger: 0.12,
          scrollTrigger: { trigger: ".cta", start: "top 75%" },
        });
      } else {
        gsap.set(".odo-strip", {
          yPercent: (i, el) => -Number(el.dataset.digit) * 10,
        });
      }

      // Nav tucks away on the way down, returns on the way up.
      const nav = document.querySelector(".landing-nav");
      ScrollTrigger.create({
        start: 80,
        end: "max",
        onUpdate: (self) => {
          nav?.classList.toggle("scrolled", self.scroll() > 40);
          if (!still)
            gsap.to(nav, {
              yPercent: self.direction === 1 ? -110 : 0,
              duration: 0.45,
              ease: "power3.out",
              overwrite: true,
            });
        },
      });

      return () => {
        alive = false;
        cleanups.forEach((c) => c());
        smoother?.kill();
        mm.revert();
      };
    },
    { scope: root, dependencies: [loaded] },
  );

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const s = ScrollSmoother.get();
    if (s) s.scrollTo("#" + id, true, "top 80px");
    else
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div ref={root} className="landing-root">
      {showLoader && (
        <div
          className="loader"
          role="status"
          aria-label="Loading AgroSentinel Nexus"
        >
          <div className="loader-inner">
            <svg
              viewBox="0 0 120 120"
              className="loader-svg"
              aria-hidden="true"
            >
              <circle className="loader-ring" cx="60" cy="60" r="54" />
            </svg>
            <span className="loader-mark">
              <Sprout size={34} strokeWidth={1.4} />
            </span>
            <span className="loader-count">0</span>
          </div>
        </div>
      )}
      <a className="skip" href="#top">
        Skip to content
      </a>
      <header className="landing-nav">
        <Brand />
        <nav className="landing-links" aria-label="Sections">
          {features.map((f) => (
            <a key={f.id} href={"#" + f.id} onClick={go(f.id)}>
              {f.n.split("/ ")[1].toLowerCase()}
            </a>
          ))}
        </nav>
        <div className="landing-nav-actions">
          <Link href="/field">Explore the field app</Link>
          <Link className="pill" href="/dashboard" data-magnetic>
            Open dashboard
            <span className="nub">
              <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </header>

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main className="landing" id="top">
            <section className="landing-hero">
              <Filament
                className="hero-filament"
                play={loaded}
                delay={0.2}
                density={1500}
              />
              <div className="hero-text">
                <div className="eyebrow hero-eyebrow">
                  COMMODITY-EDGE AGRONOMY
                </div>
                <h1 className="hero-title">
                  Any phone becomes
                  <br />a field sensor.
                </h1>
                <p className="hero-copy">
                  From a single leaf to a regional view. Grounded intelligence
                  for the people who keep our fields growing.
                </p>
                <div className="hero-actions">
                  <Link className="pill" href="/dashboard" data-magnetic>
                    Open dashboard
                    <span className="nub">
                      <ArrowUpRight size={18} />
                    </span>
                  </Link>
                  <Link className="pill lime" href="/field" data-magnetic>
                    Open the field app ↗
                  </Link>
                </div>
              </div>
              <div
                className="hero-meta"
                aria-label="Supported agricultural regions"
              >
                {regions.map((r) => (
                  <span key={r.id}>
                    <i /> {r.label}
                  </span>
                ))}
              </div>
            </section>

            <section className="statement" aria-label="Statement">
              <span className="float-chip c1" data-speed="1.15">
                <Globe size={12} /> Tavily · weather
              </span>
              <span className="float-chip c2" data-speed="0.9">
                Nemotron Nano
              </span>
              <span className="float-chip c3" data-speed="1.25">
                Nemotron Ultra
              </span>
              <p className="statement-text">
                One leaf. One plan.
                <br />
                One region that sees it.
              </p>
            </section>
          </main>

          <section className="features" aria-label="How it works">
            <div className="features-head">
              <div className="eyebrow">DESIGNED TO WORK TOGETHER</div>
              <div className="features-progress" aria-hidden="true">
                <i />
              </div>
            </div>
            <div className="feature-track">
              {features.map(({ n, id, title, body, Icon }, i) => (
                <article className={"feature-card fc-" + i} key={n} id={id}>
                  <div className="card-top card-reveal">
                    <span>{n}</span>
                    <Icon size={26} strokeWidth={1.2} />
                  </div>
                  <div className="card-media card-reveal">
                    {i === 0 ? (
                      <EdgeArt />
                    ) : i === 1 ? (
                      <BrainArt />
                    ) : (
                      <MacroArt />
                    )}
                  </div>
                  <h2 className="card-reveal">{title}</h2>
                  <p className="card-reveal">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="stats" aria-label="Workspace statistics">
            <div className="eyebrow">WORKSPACE IMPACT</div>
            <div className="stat-grid">
              {stats.map((s) => (
                <div className="stat" key={s.l}>
                  <span className="odometer" aria-label={s.v}>
                    {s.v}
                  </span>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="architecture">
            <div className="eyebrow">DESIGNED TO WORK TOGETHER</div>
            <div className="pipeline" aria-label={pipeline.join(" → ")}>
              <span className="pipe-line" aria-hidden="true" />
              {pipeline.map((p) => (
                <span className="pipe-node" key={p}>
                  {p}
                </span>
              ))}
            </div>
            <p>
              Statistics come from persisted workspace records. Savings are
              estimates based on entered treatment costs.
            </p>
            <Link className="text-button" href="/dashboard">
              Open the workspace <ArrowUpRight size={15} />
            </Link>
          </section>

          <section className="cta">
            <Filament
              tone="dark"
              layout="band"
              seed={23}
              density={700}
              className="cta-filament"
            />
            <div className="cta-inner">
              <div className="eyebrow">EVERY DECISION, GROUNDED.</div>
              <h2>
                Grounded intelligence.
                <br />
                Resilient agriculture.
              </h2>
              <div className="hero-actions">
                <Link className="pill on-dark" href="/dashboard" data-magnetic>
                  Open dashboard
                  <span className="nub">
                    <ArrowUpRight size={18} />
                  </span>
                </Link>
                <Link className="pill lime" href="/field" data-magnetic>
                  Open the field app ↗
                </Link>
              </div>
            </div>
          </section>

          <footer className="landing-footer">
            <Brand />
            <span>Grounded intelligence. Resilient agriculture.</span>
            <span>AGROSENTINEL NEXUS · v1.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

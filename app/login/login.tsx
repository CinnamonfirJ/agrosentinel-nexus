"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sprout,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { gsap, SplitText, useGSAP, magnetic } from "../motion";
import { Filament } from "../filament";

import { api } from "../client";

export function Login() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [firstRun, setFirstRun] = useState(false);
  useEffect(() => {
    api("health")
      .then((h) => setFirstRun(h.setup_required))
      .catch((e) => setError(e.message));
  }, []);
  useGSAP(
    (_ctx, contextSafe) => {
      let alive = true;
      const cleanup = magnetic(
        root.current!.querySelector(".login-submit")!,
        0.15,
      );
      // Fonts load async; contextSafe keeps the animation inside this context so a
      // React re-run (dev Strict Mode) reverts it instead of stacking a second copy.
      document.fonts.ready.then(
        contextSafe!(() => {
          if (!alive) return;
          const split = SplitText.create(".login-title", {
            type: "lines",
            mask: "lines",
          });
          gsap
            .timeline()
            .from(".login-art", {
              clipPath: "inset(0 100% 0 0)",
              duration: 1.2,
              ease: "expo.inOut",
            })
            .from(
              ".login-art-copy > *",
              { y: 30, autoAlpha: 0, stagger: 0.1 },
              0.6,
            )
            .from(
              ".login-top > *",
              { y: -16, autoAlpha: 0, stagger: 0.08, duration: 0.6 },
              0.3,
            )
            .from(
              split.lines,
              { yPercent: 110, stagger: 0.1, duration: 1, ease: "expo.out" },
              0.4,
            )
            .from(
              ".login-form > *",
              { y: 24, autoAlpha: 0, stagger: 0.07, duration: 0.7 },
              0.6,
            );
        }),
      );
      return () => {
        alive = false;
        cleanup();
      };
    },
    { scope: root },
  );

  async function enter(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(firstRun ? "auth/register" : "auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, name: email.split("@")[0] }),
      });
      router.push(
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
      );
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="login" ref={root}>
      <div className="login-wipe" aria-hidden="true" />
      <aside className="login-art">
        <Filament tone="dark" layout="panel" seed={11} density={900} />
        <div className="login-art-copy">
          <ShieldCheck size={28} strokeWidth={1.3} />
          <h2>Every decision, grounded.</h2>
          <p>Trace every recommendation back to its source.</p>
        </div>
      </aside>
      <main className="login-main">
        <div className="login-top">
          <Link className="brand" href="/">
            <span className="brandmark">
              <Sprout size={25} />
            </span>
            <span>
              agrosentinel<span className="nexus">NEXUS</span>
            </span>
          </Link>
          <Link className="text-button" href="/">
            <ArrowLeft size={15} /> Back
          </Link>
        </div>
        <div className="login-body">
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1 className="login-title">
            Your region,
            <br />
            in focus.
          </h1>
          <form className="login-form" onSubmit={enter} noValidate>
            <label>
              Work email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <span className="password">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="login-error">
                {error}
              </p>
            )}
            <button className="pill login-submit" disabled={busy}>
              {busy ? "Opening workspace…" : "Sign in to workspace"}
              <span className="nub">
                {busy ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </span>
            </button>
            <div className="demo-creds">
              <small>
                {firstRun
                  ? "First visit: choose your email and a password of at least 12 characters to create the workspace manager."
                  : "Use your registered account. Your session is verified by the backend."}
              </small>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

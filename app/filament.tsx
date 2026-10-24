"use client";
import { useEffect, useRef } from "react";
import { gsap, reducedMotion } from "./motion";

/**
 * The living filament: granular, moss-like root strands that grow in, sway,
 * and part around the pointer. Drawn on canvas so thousands of specks stay cheap.
 */
type Dot = { t: number; n: number; s: number; c: number; a: number };
type Strand = {
  p: number[];
  dots: Dot[];
  phase: number;
  amp: number;
  w: number;
  freq: number;
  meander: number;
};

const PALETTES = {
  light: ["#1E4D3A", "#2F6A45", "#5C8F45", "#9BBF4E", "#D4F36B"],
  dark: ["#3F7A4F", "#6FA35A", "#A6CF5F", "#D4F36B", "#EAF9B5"],
};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) / 2;
}
function bez(p: number[], t: number) {
  const u = 1 - t;
  const a = u * u * u,
    b = 3 * u * u * t,
    c = 3 * u * t * t,
    d = t * t * t;
  return [
    a * p[0] + b * p[2] + c * p[4] + d * p[6],
    a * p[1] + b * p[3] + c * p[5] + d * p[7],
  ];
}
function tangent(p: number[], t: number) {
  const u = 1 - t;
  const x =
    3 * u * u * (p[2] - p[0]) +
    6 * u * t * (p[4] - p[2]) +
    3 * t * t * (p[6] - p[4]);
  const y =
    3 * u * u * (p[3] - p[1]) +
    6 * u * t * (p[5] - p[3]) +
    3 * t * t * (p[7] - p[5]);
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

function build(
  seed: number,
  density: number,
  layout: "hero" | "band" | "panel",
) {
  const r = rng(seed);
  const strands: Strand[] = [];
  const main = layout === "hero" ? 3 : 4;
  for (let i = 0; i < main; i++) {
    // Normalised 0..1 space; control points sweep a vein across the frame.
    const sx = layout === "hero" ? 0.62 + r() * 0.4 : r();
    const sy = 1.05;
    const ex = layout === "hero" ? 0.45 + r() * 0.5 : r();
    const ey = -0.05 + r() * 0.25;
    const p = [
      sx,
      sy,
      sx - 0.3 + r() * 0.6,
      0.7 - r() * 0.2,
      ex - 0.35 + r() * 0.7,
      0.4 - r() * 0.2,
      ex,
      ey,
    ];
    strands.push(
      makeStrand(
        p,
        r,
        density * (1.3 + r() * 0.7),
        0.016 + r() * 0.016,
        0.025 + r() * 0.03,
      ),
    );
    // Side branches peel off the main vein.
    const branches = 3 + Math.floor(r() * 3);
    for (let b = 0; b < branches; b++) {
      const t0 = 0.2 + r() * 0.6;
      const [bx, by] = bez(p, t0);
      const dir = r() > 0.5 ? 1 : -1;
      const bp = [
        bx,
        by,
        bx + dir * (0.05 + r() * 0.1),
        by - 0.05 - r() * 0.1,
        bx + dir * (0.1 + r() * 0.15),
        by - 0.1 - r() * 0.15,
        bx + dir * (0.12 + r() * 0.22),
        by - 0.15 - r() * 0.25,
      ];
      strands.push(
        makeStrand(
          bp,
          r,
          density * 0.3,
          0.006 + r() * 0.008,
          0.01 + r() * 0.015,
        ),
      );
    }
  }
  return strands;
}
function makeStrand(
  p: number[],
  r: () => number,
  count: number,
  w: number,
  meander: number,
): Strand {
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const t = r();
    dots.push({
      t,
      n: gauss(r) * (0.5 + Math.sin(t * Math.PI) * 0.9),
      s: 0.5 + r() * r() * 2.4,
      c: Math.min(4, Math.floor(r() * r() * 5.2)),
      a: 0.25 + r() * 0.75,
    });
  }
  dots.sort((a, b) => a.t - b.t);
  return {
    p,
    dots,
    phase: r() * Math.PI * 2,
    amp: 0.006 + r() * 0.012,
    w,
    freq: 6 + r() * 7,
    meander,
  };
}

export function Filament({
  tone = "light",
  layout = "hero",
  seed = 7,
  density = 900,
  delay = 0,
  className = "",
  play = true,
}: {
  tone?: "light" | "dark";
  layout?: "hero" | "band" | "panel";
  seed?: number;
  density?: number;
  delay?: number;
  className?: string;
  play?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const grow = useRef({ p: 0 });

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const colors = PALETTES[tone];
    const small = window.innerWidth < 700;
    const strands = build(seed, small ? density * 0.45 : density, layout);
    const pointer = { x: -9999, y: -9999, active: 0 };
    let w = 0,
      h = 0,
      raf = 0,
      visible = true,
      time = 0,
      last = performance.now();
    const still = reducedMotion();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still) draw();
    };
    // Specks are batched by colour × opacity: ~15 fills per frame instead of one draw call
    // per speck, which keeps integrated GPUs and cheap laptops at full frame rate.
    const ALPHAS = [0.4, 0.7, 1];
    const BUCKETS = colors.length * ALPHAS.length + 1; // last bucket = lime growth tip
    const total = strands.reduce((n, st) => n + st.dots.length, 0);
    const xs = new Float32Array(total),
      ys = new Float32Array(total),
      ss = new Float32Array(total);
    const bk = new Uint8Array(total);
    let stride = 1,
      slow = 0;
    const draw = () => {
      const t0 = performance.now();
      ctx.clearRect(0, 0, w, h);
      const prog = grow.current.p;
      const scale = Math.max(w, h);
      const R = scale * 0.12;
      let n = 0;
      for (const st of strands) {
        const sway = Math.sin(time * 0.45 + st.phase);
        const dots = st.dots;
        for (let i = 0; i < dots.length; i += stride) {
          const d = dots[i];
          if (d.t > prog) break;
          const [bx, by] = bez(st.p, d.t);
          const [tx, ty] = tangent(st.p, d.t);
          const off =
            d.n * st.w +
            Math.sin(d.t * st.freq + st.phase) *
              st.meander *
              Math.sin(d.t * Math.PI);
          let x =
            (bx +
              -ty * off +
              Math.sin(time * 0.6 + d.t * 7 + st.phase) * st.amp * d.t +
              sway * 0.01 * d.t) *
            w;
          let y = (by + tx * off) * h;
          if (pointer.active > 0.01) {
            const dx = x - pointer.x,
              dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < R) {
              const f = (1 - dist / R) ** 2 * 26 * pointer.active;
              x += (dx / (dist || 1)) * f;
              y += (dy / (dist || 1)) * f;
            }
          }
          xs[n] = x;
          ys[n] = y;
          ss[n] = d.s;
          bk[n] =
            prog < 1 && prog - d.t < 0.04
              ? BUCKETS - 1
              : d.c * ALPHAS.length + Math.min(2, Math.floor(d.a * 3));
          n++;
        }
      }
      for (let b = 0; b < BUCKETS; b++) {
        const tip = b === BUCKETS - 1;
        ctx.globalAlpha = tip ? 1 : ALPHAS[b % ALPHAS.length];
        ctx.fillStyle = tip ? colors[4] : colors[Math.floor(b / ALPHAS.length)];
        ctx.beginPath();
        for (let i = 0; i < n; i++)
          if (bk[i] === b) ctx.rect(xs[i], ys[i], ss[i], ss[i]);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Adaptive quality: if frames get expensive, draw fewer specks rather than drop frames.
      const cost = performance.now() - t0;
      slow = cost > 9 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 20 && stride < 4) {
        stride++;
        slow = 0;
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      pointer.active += ((pointer.x > -999 ? 1 : 0) - pointer.active) * 0.08;
      if (visible && document.visibilityState === "visible") draw();
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();

    let tween: gsap.core.Tween | undefined;
    if (still) {
      grow.current.p = 1;
      draw();
    } else {
      const host = canvas.parentElement!;
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(loop);
      if (play)
        tween = gsap.to(grow.current, {
          p: 1,
          duration: 3.2,
          delay,
          ease: "power2.out",
        });
      return () => {
        cancelAnimationFrame(raf);
        tween?.kill();
        ro.disconnect();
        io.disconnect();
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
      };
    }
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [tone, layout, seed, density, delay, play]);

  return (
    <canvas
      ref={ref}
      className={"filament-canvas " + className}
      aria-hidden="true"
    />
  );
}

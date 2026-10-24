"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

let registered = false;
if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(
    useGSAP,
    ScrollTrigger,
    ScrollSmoother,
    SplitText,
    DrawSVGPlugin,
    MorphSVGPlugin,
    Draggable,
    InertiaPlugin,
    Flip,
    CustomEase,
  );
  CustomEase.create("field", "0.22, 1, 0.36, 1");
  CustomEase.create("settle", "0.65, 0, 0.35, 1");
  gsap.defaults({ ease: "field", duration: 0.8 });
  // Keep animations on real time. With lag smoothing, slow or throttled frames stretch
  // entrance animations indefinitely and content that starts hidden appears "stuck".
  gsap.ticker.lagSmoothing(0);
  registered = true;
}

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pull an element toward the pointer while hovered — the round nub on pills. */
export function magnetic(el: HTMLElement, strength = 0.35) {
  if (reducedMotion()) return () => {};
  const xTo = gsap.quickTo(el, "x", {
    duration: 0.6,
    ease: "elastic.out(1, 0.45)",
  });
  const yTo = gsap.quickTo(el, "y", {
    duration: 0.6,
    ease: "elastic.out(1, 0.45)",
  });
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    xTo(0);
    yTo(0);
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", leave);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", leave);
  };
}

/** Count a number (keeps prefix/suffix like "$" and "k") up from zero. */
export function countUp(
  el: HTMLElement,
  final: string,
  duration = 1.4,
  delay = 0,
) {
  const m = final.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
  if (!m || reducedMotion()) {
    el.textContent = final;
    return;
  }
  const [, pre, num, post] = m;
  const target = parseFloat(num.replace(/,/g, ""));
  const decimals = num.includes(".") ? num.split(".")[1].length : 0;
  const commas = num.includes(",");
  const state = { v: 0 };
  gsap.to(state, {
    v: target,
    duration,
    delay,
    ease: "power3.out",
    onUpdate: () => {
      const n = state.v.toFixed(decimals);
      el.textContent =
        pre +
        (commas
          ? Number(n).toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : n) +
        post;
    },
  });
}

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  Draggable,
  Flip,
  useGSAP,
};

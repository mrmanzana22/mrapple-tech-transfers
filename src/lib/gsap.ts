"use client";

/**
 * ============================================
 * GSAP — Centralized setup for MrApple Tech Transfers
 * ============================================
 *
 * Single source of truth for GSAP config. Import `gsap` and the
 * registered plugins from HERE, never directly from "gsap", so that
 * plugin registration and global defaults are guaranteed to run.
 *
 *   import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
 *
 * Global defaults mirror our CSS motion tokens (see globals.css):
 *   --duration-base = 0.3s   |   --ease-out-quint cubic-bezier
 *
 * Reduced motion:
 *   Use `prefersReducedMotion()` for one-off checks, or wrap timelines
 *   in `gsap.matchMedia()` with the `(prefers-reduced-motion: ...)`
 *   queries. The <Reveal> component already handles this for you.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

// Register plugins once (guarded for HMR / double-import).
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Flip, useGSAP);

  // Global defaults — keep in sync with the CSS motion tokens.
  // ease "expo.out" ≈ --ease-out-quint, a confident Apple-grade decel.
  gsap.defaults({
    ease: "expo.out",
    duration: 0.45,
  });
}

/** Named easings — mirror the CSS `--ease-*` tokens for JS tweens. */
export const EASE = {
  /** Snappy decelerate. Matches --ease-out-quint. */
  outQuint: "expo.out",
  /** Standard material-ish ease. Matches --ease-standard. */
  standard: "power2.out",
  /** Gentle spring for playful, opt-in moments. Matches --ease-spring. */
  spring: "back.out(1.4)",
  /** Symmetric in-out for loops / reversible states. */
  inOut: "power2.inOut",
} as const;

/** Named durations (seconds) — mirror the CSS `--duration-*` tokens. */
export const DURATION = {
  fast: 0.15,
  base: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

/** True when the user asked the OS to reduce motion. SSR-safe (false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, Flip, useGSAP };

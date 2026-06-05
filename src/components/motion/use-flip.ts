"use client";

import * as React from "react";
import { gsap, Flip, EASE, DURATION, prefersReducedMotion } from "@/lib/gsap";

/**
 * useFlip — FLIP transitions for list reorders / filter changes.
 *
 * Record positions BEFORE a state change that reflows a list, then call
 * `play()` AFTER the DOM updates. GSAP Flip animates the delta smoothly.
 * No-op (instant) under prefers-reduced-motion.
 *
 *   import { useFlip } from "@/components/motion/use-flip";
 *
 *   const listRef = useRef<HTMLUListElement>(null);
 *   const flip = useFlip(listRef, "[data-flip-id]");
 *
 *   function onFilter(next) {
 *     flip.capture();        // 1. snapshot current layout
 *     setItems(next);        // 2. trigger React re-render
 *   }
 *   useLayoutEffect(() => { flip.play(); }, [items]); // 3. animate after paint
 *
 * Each animated item must carry a stable `data-flip-id` (or your selector).
 * This hook does NOT own list state — it only animates layout deltas.
 */

type FlipApi = {
  /** Snapshot current positions of matched items. Call before the state change. */
  capture: () => void;
  /** Animate from the last snapshot to the new layout. Call after re-render. */
  play: (opts?: { duration?: number; ease?: string; stagger?: number }) => void;
};

export function useFlip(
  containerRef: React.RefObject<HTMLElement>,
  selector = "[data-flip-id]"
): FlipApi {
  const stateRef = React.useRef<Flip.FlipState | null>(null);

  const capture = React.useCallback(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion()) return;
    const items = el.querySelectorAll(selector);
    if (items.length) stateRef.current = Flip.getState(items);
  }, [containerRef, selector]);

  const play = React.useCallback(
    (opts?: { duration?: number; ease?: string; stagger?: number }) => {
      if (!stateRef.current || prefersReducedMotion()) {
        stateRef.current = null;
        return;
      }
      Flip.from(stateRef.current, {
        duration: opts?.duration ?? DURATION.slow,
        ease: opts?.ease ?? EASE.outQuint,
        stagger: opts?.stagger ?? 0,
        absolute: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { opacity: 0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: DURATION.base, ease: EASE.outQuint }
          ),
        onLeave: (els) =>
          gsap.to(els, { opacity: 0, scale: 0.96, duration: DURATION.fast }),
      });
      stateRef.current = null;
    },
    []
  );

  return { capture, play };
}

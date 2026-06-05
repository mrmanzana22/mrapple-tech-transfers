"use client";

import * as React from "react";
// ScrollTrigger is registered centrally in "@/lib/gsap"; importing gsap here
// guarantees that module (and its plugin registration) has executed.
import { gsap, EASE, DURATION } from "@/lib/gsap";
import { cn } from "@/lib/utils";

// Run before paint on the client (avoids the visible→hidden flash when we set
// the entrance "from" state), but degrade to useEffect on the server so SSR
// never warns. The server-rendered HTML is always fully visible.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * <Reveal> — scroll-reveal wrapper (GSAP ScrollTrigger).
 *
 * Fades + lifts its children into view once, when they enter the viewport.
 * Honors prefers-reduced-motion via gsap.matchMedia (renders fully visible,
 * no transform) so content is NEVER hidden for those users.
 *
 *   import { Reveal } from "@/components/motion/reveal";
 *
 *   <Reveal>...</Reveal>
 *   <Reveal as="li" y={32} delay={0.1}>...</Reveal>
 *   <Reveal stagger={0.06}>  // staggers DIRECT children instead
 *     <Card/>...<Card/>
 *   </Reveal>
 *
 * Pure presentation: no data, no handlers. Safe to wrap anything.
 */

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Element/tag to render. Default "div". */
  as?: React.ElementType;
  /** Initial Y offset in px (travels up to 0). Default 24. */
  y?: number;
  /** Delay before animating, seconds. Default 0. */
  delay?: number;
  /** Tween duration, seconds. Default DURATION.slow (0.5). */
  duration?: number;
  /** If > 0, animates DIRECT children with this stagger (seconds). */
  stagger?: number;
  /** ScrollTrigger start. Default "top 88%". */
  start?: string;
  /** Re-run every time it scrolls into view. Default false (once). */
  repeat?: boolean;
  /**
   * Play on mount instead of on scroll. Use for ABOVE-THE-FOLD content
   * (it's already in view, so a scroll trigger would only add latency and
   * risk a blank frame). Default false.
   */
  immediate?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, "children">;

export function Reveal({
  children,
  className,
  as: Tag = "div",
  y = 24,
  delay = 0,
  duration = DURATION.slow,
  stagger = 0,
  start = "top 88%",
  repeat = false,
  immediate = false,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    // Failsafe: if the tween never plays (background tab, headless render,
    // a ScrollTrigger that doesn't fire), force the content visible so we
    // NEVER ship a blank section. The reveal only ever enhances a visible
    // default — it must not gate visibility.
    let safety: ReturnType<typeof setTimeout> | undefined;

    mm.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        ok: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        const { reduced } = ctx.conditions as { reduced: boolean };
        const targets = stagger > 0 ? Array.from(el.children) : el;

        if (reduced) {
          gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        const tween = gsap.fromTo(
          targets,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration,
            delay,
            ease: EASE.outQuint,
            stagger: stagger > 0 ? stagger : 0,
            // Above-the-fold: animate on mount. Below-the-fold: on scroll.
            scrollTrigger: immediate
              ? undefined
              : {
                  trigger: el,
                  start,
                  toggleActions: repeat
                    ? "play none none reverse"
                    : "play none none none",
                  once: !repeat,
                },
          }
        );

        safety = setTimeout(() => {
          if (tween.progress() > 0) return;
          // Only rescue content that's actually on screen: below-the-fold
          // items are correctly still hidden, waiting to reveal on scroll.
          const rect = el.getBoundingClientRect();
          const inView = rect.top < window.innerHeight && rect.bottom > 0;
          if (immediate || inView) {
            gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
          }
        }, 1500);
      }
    );

    return () => {
      if (safety) clearTimeout(safety);
      mm.revert();
    };
  }, [y, delay, duration, stagger, start, repeat, immediate]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={cn(className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <SegmentedTabs> — control segmentado estilo iOS con PILL DESLIZANTE.
 *
 * El indicador (pill elevado y más claro) se desliza al segmento activo sobre
 * un track hundido. Se mide la posición/ancho del botón activo y el pill anima
 * su `transform`/`width` hacia allí. La distinción activo/inactivo viene de tres
 * señales: elevación, luminosidad y peso de texto.
 *
 * El deslizamiento se activa SOLO tras el primer posicionamiento (rAF), para no
 * "entrar desde la izquierda" al montar. Pura presentación: el estado lo
 * controla el caller. NO usa pressable-sm en los botones (su scale al presionar
 * causaba un saltico instantáneo que se sentía como jitter en un track angosto).
 *
 *   <SegmentedTabs
 *     value={tab}
 *     onValueChange={(v) => setTab(v)}
 *     options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]}
 *   />
 */

interface SegOption {
  value: string;
  label: React.ReactNode;
}

interface SegmentedTabsProps {
  options: SegOption[];
  value: string;
  onValueChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedTabs({
  options,
  value,
  onValueChange,
  size = "md",
  className,
}: SegmentedTabsProps) {
  const n = options.length;
  const pad = size === "sm" ? 4 : 6; // p-1 / p-1.5 en px (alto del pill = track - 2*pad)

  const containerRef = React.useRef<HTMLDivElement>(null);
  const btnRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const [animate, setAnimate] = React.useState(false);

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  // Mide la posición/ancho del botón activo y reubica el pill. Se re-mide al
  // cambiar de valor, cantidad de opciones o tamaño del contenedor (responsive).
  React.useLayoutEffect(() => {
    const update = () => {
      const b = btnRefs.current[activeIndex];
      if (!b) return;
      setIndicator({ left: b.offsetLeft, width: b.offsetWidth });
    };
    update();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [activeIndex, n]);

  // Habilita la transición de deslizamiento solo DESPUÉS de posicionar la
  // primera vez, así no se desliza desde 0 al montar.
  React.useEffect(() => {
    if (indicator && !animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [indicator, animate]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative grid isolate rounded-2xl bg-background/80 ring-1 ring-inset ring-border",
        size === "sm" ? "p-1" : "p-1.5",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {/* Pill deslizante (un solo indicador que se mueve al segmento activo). */}
      {indicator && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 z-0 rounded-xl bg-accent shadow-e2 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.08]",
            animate &&
              "transition-[transform,width] duration-base ease-out-quint motion-reduce:transition-none"
          )}
          style={{
            top: pad,
            bottom: pad,
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      )}

      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onValueChange(o.value)}
            aria-pressed={active}
            className={cn(
              "relative z-10 cursor-pointer select-none rounded-xl px-4 text-sm transition-colors duration-base ease-out-quint",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:ring-offset-0",
              size === "sm" ? "py-1.5" : "py-2.5",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground/80"
            )}
          >
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

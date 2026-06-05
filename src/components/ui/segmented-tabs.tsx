"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <SegmentedTabs> — control segmentado estilo iOS con pill deslizante.
 *
 * El indicador (pill elevado y más claro) se desliza al segmento activo con
 * un leve overshoot, sobre un track hundido y oscuro. La distinción
 * activo/inactivo viene de tres señales a la vez: elevación, luminosidad y
 * peso de texto. Pura presentación: el estado lo controla el caller.
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

  return (
    <div
      className={cn(
        "relative grid isolate rounded-2xl bg-background/80 ring-1 ring-inset ring-border",
        size === "sm" ? "p-1" : "p-1.5",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onValueChange(o.value)}
            aria-pressed={active}
            className={cn(
              // SIN pressable-sm: el scale(0.98) al presionar daba un saltico
              // instantáneo (sin transición) que se sentía como jitter en un
              // track angosto. El feedback ya lo da el pill que hace crossfade.
              "relative z-10 cursor-pointer select-none rounded-xl px-4 text-sm transition-colors duration-base ease-out-quint",
              // Ring de teclado discreto, pegado al botón (sin offset que flote
              // por fuera y se vea descuadrado). En click/pointer no aparece.
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:ring-offset-0",
              size === "sm" ? "py-1.5" : "py-2.5",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground/80"
            )}
          >
            {/* Pill de fondo por botón: crossfade (aparece/desaparece en sitio),
                sin deslizamiento lateral. */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 z-0 rounded-xl bg-accent shadow-e2 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.08]",
                "transition-opacity duration-base ease-out-quint motion-reduce:transition-none",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

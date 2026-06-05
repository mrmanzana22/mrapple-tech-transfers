"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP, EASE, DURATION, prefersReducedMotion } from "@/lib/gsap";

/**
 * <DetailSheet> — tarjeta de detalle CENTRADA en pantalla (móvil y desktop).
 *
 * Aparece centrada con zoom+fade sobre un fondo oscurecido + blur. Trae
 * focus-trap, Esc, scroll-lock y cierre al tocar fuera (Radix Dialog).
 *
 * Importante (iOS Safari): NO se usa `flex-1 + overflow` para el cuerpo dentro
 * de una tarjeta de altura por contenido — eso colapsa el body a 0 en Safari.
 * En su lugar, la TARJETA ENTERA es el contenedor scrolleable (`max-h` +
 * `overflow-y-auto`) y el header/footer quedan fijos con `position: sticky`.
 * Así nunca hay colapso y siempre se ve todo el contenido.
 *
 * El centrado por translate(-50%,-50%) + la animación `dialog-pop` (definida en
 * globals.css) preservan el translate en cada frame: nada de saltos.
 *
 * Pura presentación: el contenido lo arma cada caller vía children.
 *
 *   <DetailSheet open={!!item} onOpenChange={(o) => !o && setItem(null)} title="Detalle">
 *     ...
 *   </DetailSheet>
 */

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Slot fijo al pie (acciones). Queda pegado abajo vía sticky. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: DetailSheetProps) {
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // Al abrir, las filas del contenido entran escalonadas. Remate "wow" sin
  // pelear con el zoom+fade de la tarjeta. Silencioso bajo reduced-motion.
  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return;
      const rows = bodyRef.current?.firstElementChild?.children;
      if (!rows || rows.length === 0) return;
      gsap.fromTo(
        rows,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: DURATION.base,
          ease: EASE.outQuint,
          stagger: 0.055,
          delay: 0.14,
        }
      );
    },
    { dependencies: [open] }
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/70 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:animate-none"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            // Tarjeta centrada por translate; LA TARJETA es el área scrolleable
            // (max-h + overflow). Sin flex-1 interno => sin colapso en Safari.
            "dialog-pop fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100%-1.5rem)] max-w-lg max-h-[85dvh] overflow-y-auto overscroll-contain",
            "rounded-3xl border border-border bg-popover shadow-e4 focus:outline-none",
            "sm:w-full sm:max-h-[85vh]",
            className
          )}
        >
          {/* Header — sticky para quedar visible si el contenido scrollea. */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-popover px-6 pt-5 pb-4 sm:pt-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="pressable -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-inset ring-border transition-[background-color,color] duration-fast ease-out-quint hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body — fluye normal; el scroll lo lleva la tarjeta. */}
          <div
            ref={bodyRef}
            className={cn("px-6", footer ? "pb-4" : "pb-6")}
          >
            {children}
          </div>

          {/* Footer opcional — pegado abajo con sticky + safe-area. */}
          {footer && (
            <div className="sticky bottom-0 z-10 hairline-t bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP, EASE, DURATION, prefersReducedMotion } from "@/lib/gsap";

/**
 * <DetailSheet> — bottom-sheet de detalle (estilo app nativa iOS).
 *
 * Sube desde abajo sobre un fondo oscurecido + blur. Trae focus-trap, Esc,
 * scroll-lock y cierre al tocar fuera de Radix Dialog. La animación de
 * entrada/salida (slide desde abajo) viene de tailwindcss-animate y se
 * neutraliza bajo prefers-reduced-motion (solo fade).
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
  /** Slot fijo al pie (acciones). Queda fuera del área scrolleable. */
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

  // Tras subir el panel, las filas del contenido entran escalonadas. Da el
  // remate "wow" al abrir sin pelear con la animación de slide del sheet.
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
            "fixed z-50 flex flex-col bg-popover shadow-e4 focus:outline-none",
            // Móvil: bottom-sheet pegado abajo, ancho completo.
            "inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-lg rounded-t-3xl border-t border-border",
            // Desktop: tarjeta centrada (centrado por margin auto, sin transform
            // que pelee con la animación de zoom).
            "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:rounded-3xl sm:border",
            "duration-slow ease-out-quint",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Móvil: sube desde abajo. Desktop: anula el slide y usa zoom+fade.
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            "motion-reduce:!animate-none",
            className
          )}
        >
          {/* Grabber (solo móvil) */}
          <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-2 pb-4 sm:pt-6">
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

          {/* Scrollable body */}
          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            {children}
          </div>

          {/* Optional fixed footer */}
          {footer && (
            <div className="shrink-0 hairline-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

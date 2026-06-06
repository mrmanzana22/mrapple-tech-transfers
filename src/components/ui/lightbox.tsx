"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * <Lightbox> — visor de imagen a pantalla completa, NATIVO de la app.
 *
 * Reemplaza el viejo `<a target="_blank">` que sacaba al usuario a una pestaña
 * cruda del navegador. Acá la foto se ve COMPLETA (object-contain, sin recorte),
 * con tap para hacer zoom y arrastrar para moverla, estilo Fotos de iOS.
 *
 * Cierre: botón ✕, tecla Esc, o tocar el fondo oscuro (fuera de la imagen).
 * Tocar la imagen NO cierra: alterna el zoom.
 *
 * Se monta por encima del DetailSheet (z-[70] > z-50) para que funcione aun
 * estando abierto un detalle.
 */

const ZOOM = 2.5;

interface LightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  alt?: string;
}

export function Lightbox({ open, onOpenChange, src, alt }: LightboxProps) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [zoomed, setZoomed] = React.useState(false);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  // Estado del gesto (en refs para no re-renderizar en cada move).
  const drag = React.useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  // Reset al abrir/cerrar o cambiar de imagen.
  React.useEffect(() => {
    setZoomed(false);
    setOffset({ x: 0, y: 0 });
  }, [open, src]);

  // Límites de desplazamiento: la imagen no se puede arrastrar más allá de su
  // propio borde cuando está ampliada.
  const clamp = React.useCallback((x: number, y: number) => {
    const el = imgRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    // r ya refleja la escala aplicada; el sobrante a cada lado es la mitad.
    const maxX = Math.max(0, (r.width - window.innerWidth) / 2 + 24);
    const maxY = Math.max(0, (r.height - window.innerHeight) / 2 + 24);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) d.moved = true;
    if (!zoomed) return; // sin zoom no se arrastra
    setOffset(clamp(d.baseX + dx, d.baseY + dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    d.active = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    // Tap (sin arrastrar) => alterna zoom.
    if (!d.moved) {
      if (zoomed) {
        setZoomed(false);
        setOffset({ x: 0, y: 0 });
      } else {
        setZoomed(true);
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:animate-none"
          )}
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[70] flex items-center justify-center focus:outline-none"
          // Cerrar al tocar el fondo (no la imagen).
          onClick={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt || "Foto"}
          </DialogPrimitive.Title>

          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt={alt || "Foto"}
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoomed ? ZOOM : 1})`,
                transition: drag.current.active
                  ? "none"
                  : "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                touchAction: "none",
              }}
              className={cn(
                "max-h-[92dvh] max-w-[92vw] select-none object-contain",
                "motion-reduce:transition-none",
                zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
              )}
            />
          )}

          <DialogPrimitive.Close
            className="pressable absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-[background-color] duration-fast ease-out-quint hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Cerrar foto"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Toggle de tema claro/oscuro con reveal circular (View Transitions API).
 *
 * Al tocar, el nuevo tema entra como un círculo que se expande DESDE el propio
 * botón hasta cubrir la pantalla (sensación premium, tipo iOS/macOS). Si el
 * navegador no soporta startViewTransition, o el usuario pidió reduced-motion,
 * cae a un cambio instantáneo sin animación.
 *
 * Alterna sobre el tema RESUELTO (resolvedTheme): aunque se arranque en
 * "system", el primer toque lleva al contrario de lo que se ve. Hasta montar,
 * renderiza un placeholder del mismo tamaño para no romper la hidratación.
 */

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => setMounted(true), []);

  const toggle = React.useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    // Fallback: sin View Transitions o con reduced-motion → cambio directo.
    if (!doc.startViewTransition || reducedMotion()) {
      setTheme(next);
      return;
    }

    // Centro del reveal = centro del botón. Radio = esquina más lejana.
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      // flushSync para que la clase .dark se aplique DENTRO de la transición,
      // si no React batchea y el snapshot se toma antes de actualizar el DOM.
      flushSync(() => setTheme(next));
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-hidden
        tabIndex={-1}
        className={className}
      >
        <span className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      ref={btnRef}
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={className}
    >
      <span className="relative block h-5 w-5">
        <Sun
          className="absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-base ease-out-quint motion-reduce:transition-none data-[on=false]:rotate-90 data-[on=false]:scale-0 data-[on=false]:opacity-0"
          data-on={!isDark}
        />
        <Moon
          className="absolute inset-0 h-5 w-5 transition-[opacity,transform] duration-base ease-out-quint motion-reduce:transition-none data-[on=false]:-rotate-90 data-[on=false]:scale-0 data-[on=false]:opacity-0"
          data-on={isDark}
        />
      </span>
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}

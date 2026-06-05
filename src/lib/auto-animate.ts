import type {
  AutoAnimateOptions,
  AutoAnimationPlugin,
} from "@formkit/auto-animate";

/**
 * Plugin de keyframes para useAutoAnimate, afinado para listas Y grids.
 *
 * El plugin por defecto entra/sale con `scale(.98) → scale(1)`. En tarjetas
 * full-width ese scale hace que los bordes "respiren" en horizontal: se siente
 * como un scroll lateral incómodo al cargar/filtrar. Aquí:
 *
 *  - add    → translateY + opacity (SIN scale): nada de respiro lateral.
 *  - remove → gesto de "enviado": se desliza a la derecha, encoge y desvanece.
 *             (la tarjeta saliente está en position:absolute, no empuja a las
 *             demás, así que no genera jitter en el resto.)
 *  - remain → translate(deltaX, deltaY): las tarjetas que se quedan fluyen a su
 *             nueva posición en AMBOS ejes. Imprescindible en grid, donde quitar
 *             un item reacomoda en horizontal y vertical a la vez.
 *
 * Firma del plugin: (el, action, newCoordinates, oldCoordinates).
 * Respeta prefers-reduced-motion (duración 0 = sin animación).
 */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const IN_SHIFT = 10; // px de entrada vertical
const OUT_SHIFT = 28; // px de salida horizontal (gesto de envío)

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export const verticalFade: AutoAnimationPlugin = (
  el,
  action,
  newCoordinates,
  oldCoordinates
) => {
  const reduce = reducedMotion();
  let keyframes: Keyframe[] = [];
  let duration = 280;

  if (action === "add") {
    keyframes = [
      { transform: `translateY(${IN_SHIFT}px)`, opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ];
    duration = 300;
  } else if (action === "remove") {
    // Gesto de "transferido / enviado": vuela a la derecha y se desvanece.
    keyframes = [
      { transform: "translateX(0) scale(1)", opacity: 1 },
      { transform: "translateX(8px) scale(0.98)", opacity: 0.85, offset: 0.35 },
      { transform: `translateX(${OUT_SHIFT}px) scale(0.92)`, opacity: 0 },
    ];
    duration = 320;
  } else {
    // "remain": el item se reubica. Animamos el delta completo (X e Y) para que
    // el reacomodo del grid sea fluido, no un salto seco en horizontal.
    const deltaX = (oldCoordinates?.left ?? 0) - (newCoordinates?.left ?? 0);
    const deltaY = (oldCoordinates?.top ?? 0) - (newCoordinates?.top ?? 0);
    keyframes = [
      { transform: `translate(${deltaX}px, ${deltaY}px)` },
      { transform: "translate(0, 0)" },
    ];
    duration = 300;
  }

  return new KeyframeEffect(el, keyframes, {
    duration: reduce ? 0 : duration,
    easing: EASE,
  });
};

/** Opciones equivalentes por si en algún punto se prefiere la API de options. */
export const autoAnimateOptions: Partial<AutoAnimateOptions> = {
  duration: 280,
  easing: EASE,
};

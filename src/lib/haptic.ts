/**
 * Haptic Feedback Helper
 * Patrones de vibración seguros para acciones clave en móvil.
 * Respeta navegadores sin soporte de la Vibration API (SSR-safe + try/catch).
 */

type VibratePattern = number | number[];

/** Vibración simple (10ms). Feedback inmediato sin distraer. */
export const HAPTIC_LIGHT: VibratePattern = 10;

/** Éxito: corta-pausa-corta. Transferencias, marcar reparado. */
export const HAPTIC_SUCCESS: VibratePattern = [10, 40, 20];

/** Advertencia: para errores o acciones a confirmar. */
export const HAPTIC_WARNING: VibratePattern = [20, 30, 20];

/**
 * Dispara una vibración háptica. No bloqueante y silenciosa si no hay soporte.
 * @param pattern ms (número) o patrón [vibra, pausa, vibra, ...]
 */
export function triggerHaptic(pattern: VibratePattern): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Algunos contextos (iframes, modo privado) lanzan; no debe romper la UX.
  }
}

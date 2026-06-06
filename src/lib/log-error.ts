// Helper de telemetría de errores (cliente).
//
// Envía un error a /api/client-error en modo fire-and-forget. Está diseñado
// para NO lanzar ni bloquear nunca: si el reporte falla, se ignora en silencio.
// Úsalo en los catch donde antes solo había console.error y nadie se enteraba.

interface LogErrorExtra {
  item_id?: string;
  tecnico?: string;
}

export function logError(
  contexto: string,
  error: unknown,
  extra?: LogErrorExtra
): void {
  try {
    const mensaje = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const payload = {
      contexto,
      mensaje,
      stack,
      item_id: extra?.item_id,
      tecnico: extra?.tecnico,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // keepalive: que sobreviva aunque la pestaña se esté cerrando.
    void fetch("/api/client-error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "mrapple",
      },
      credentials: "include",
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nunca propagar.
  }
}

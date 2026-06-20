"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";

export interface TransferFailure {
  nombre: string;
  reason: string;
  /** Código del backend para etiquetar el tipo de error (ERROR_MONDAY, …). */
  code?: string;
}

// Etiqueta corta + tono según el origen del error, para que el técnico distinga
// de un vistazo "esto es un error de Monday" vs "esta reparación no es tuya".
function failTag(code?: string): { label: string; isMonday: boolean } | null {
  switch (code) {
    case "ERROR_MONDAY":
      return { label: "⚠️ Error de Monday", isMonday: true };
    case "N8N_ERROR":
      return { label: "⚙️ Error de automatización", isMonday: true };
    case "NOT_OWNER":
      return { label: "No es tuya", isMonday: false };
    case "SIN_ASIGNAR":
      return { label: "Sin técnico en Monday", isMonday: false };
    case "ITEM_NO_EXISTE":
      return { label: "Ya no existe en Monday", isMonday: false };
    case "NETWORK":
      return { label: "Sin conexión", isMonday: false };
    default:
      return null;
  }
}

export interface TransferJob {
  total: number;
  done: number;
  fail: number;
  // Equipos que fallaron (con su motivo), para que el técnico sepa cuáles
  // reintentar en vez de tener que revisar la lista a mano.
  failures?: TransferFailure[];
}

interface TransferProgressProps {
  job: TransferJob;
}

// Indicador flotante de progreso de transferencias.
// Se muestra abajo-derecha mientras corren las transferencias en background,
// dejando al técnico seguir navegando.
export function TransferProgress({ job }: TransferProgressProps) {
  const { total, done, fail, failures } = job;
  const finished = done >= total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasFail = fail > 0;
  const [showFails, setShowFails] = useState(false);
  const failList = failures ?? [];

  const titulo = finished
    ? hasFail
      ? `Listo · ${fail} con error`
      : total === 1
      ? "Teléfono transferido"
      : "Transferencias completadas"
    : total === 1
    ? "Transfiriendo teléfono…"
    : `Pasando ${done} de ${total}…`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border border-border bg-card/95 p-4 shadow-e4 backdrop-blur-md animate-slide-in-right">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {!finished ? (
            <Loader2 className="h-5 w-5 animate-spin text-sky-600 dark:text-sky-400" />
          ) : hasFail ? (
            <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{titulo}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-[width] duration-base ease-out-quint ${
                hasFail && finished ? "bg-amber-400" : finished ? "bg-primary" : "bg-sky-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detalle de fallidos: qué equipos no se pudieron transferir. */}
      {finished && failList.length > 0 && (
        <div className="mt-3 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => setShowFails((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-xs font-medium text-amber-700 transition-colors duration-fast hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
            aria-expanded={showFails}
          >
            <span>Ver cuáles fallaron ({failList.length})</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-base ease-out-quint ${
                showFails ? "rotate-180" : ""
              }`}
            />
          </button>
          {showFails && (
            <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto overscroll-contain">
              {failList.map((f, i) => {
                const tag = failTag(f.code);
                return (
                  <li
                    key={`${f.nombre}-${i}`}
                    className="rounded-lg bg-amber-500/[0.08] px-2.5 py-1.5 ring-1 ring-inset ring-amber-500/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-foreground">{f.nombre}</p>
                      {tag && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            tag.isMonday
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {tag.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">{f.reason}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

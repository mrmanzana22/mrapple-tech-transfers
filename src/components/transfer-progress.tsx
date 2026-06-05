"use client";

import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export interface TransferJob {
  total: number;
  done: number;
  fail: number;
}

interface TransferProgressProps {
  job: TransferJob;
}

// Indicador flotante de progreso de transferencias.
// Se muestra abajo-derecha mientras corren las transferencias en background,
// dejando al técnico seguir navegando.
export function TransferProgress({ job }: TransferProgressProps) {
  const { total, done, fail } = job;
  const finished = done >= total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasFail = fail > 0;

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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Smartphone, ShieldCheck } from "lucide-react";
import Image from "next/image";

interface RepairData {
  itemId: string;
  status: "pending" | "approved" | "rejected";
  clienteNombre: string;
  tipoReparacion: string;
  serialImei: string;
  valorACobrar: number;
  reparadoA: string;
  tokenExpiresAt: string;
}

type PageState = "loading" | "ready" | "confirming" | "success" | "error" | "expired" | "already_decided";

export default function RepairApprovalPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const itemId = params.itemId as string;
  const token = searchParams.get("t") || "";

  const [state, setState] = useState<PageState>("loading");
  const [repair, setRepair] = useState<RepairData | null>(null);
  const [error, setError] = useState<string>("");
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);
  const [finalDecision, setFinalDecision] = useState<string>("");

  useEffect(() => {
    if (!itemId || !token) {
      setError("Link invalido");
      setState("error");
      return;
    }
    fetchRepair();
  }, [itemId, token]);

  async function fetchRepair() {
    try {
      const res = await fetch(`/api/client/repair/${itemId}?t=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.expired) {
          setState("expired");
        } else if (data.status && data.status !== "pending") {
          setFinalDecision(data.status);
          setState("already_decided");
        } else {
          setError(data.error || "Error al cargar");
          setState("error");
        }
        return;
      }

      if (data.data.status !== "pending") {
        setFinalDecision(data.data.status);
        setState("already_decided");
        return;
      }

      setRepair(data.data);
      setState("ready");
    } catch {
      setError("Error de conexion");
      setState("error");
    }
  }

  async function handleDecision(decision: "approved" | "rejected") {
    setPendingDecision(decision);
    setState("confirming");
  }

  async function confirmDecision() {
    if (!pendingDecision) return;

    setState("loading");
    try {
      const res = await fetch(`/api/client/approval/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: pendingDecision, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.expired) {
          setState("expired");
        } else {
          setError(data.error || "Error al procesar");
          setState("error");
        }
        return;
      }

      setFinalDecision(pendingDecision);
      setState("success");
    } catch {
      setError("Error de conexion");
      setState("error");
    }
  }

  function cancelConfirm() {
    setPendingDecision(null);
    setState("ready");
  }

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-6">
      {/* Ambient depth — quiet neutral wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(240_5%_11%/0.9),transparent_60%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header con Logo */}
        <div className="animate-fade-in mb-9 flex flex-col items-center text-center">
          <div className="relative mb-4 grid h-[4.5rem] w-[4.5rem] place-items-center overflow-hidden rounded-[1.25rem] bg-card shadow-e3 ring-1 ring-white/10">
            <div className="sheen pointer-events-none absolute inset-0" />
            <Image
              src="/logo.png"
              alt="Mister Manzana"
              width={56}
              height={56}
              className="relative object-contain"
            />
          </div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-foreground">
            Mister Manzana
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Reparaciones
          </p>
        </div>

        {/* Card Principal */}
        <div className="surface-raised sheen overflow-hidden rounded-[1.5rem] shadow-e4">
          {/* Loading */}
          {state === "loading" && (
            <div className="animate-fade-in p-10 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-secondary">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Cargando informacion...</p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="animate-fade-in p-10 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-secondary ring-1 ring-border">
                <AlertCircle className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">Oops!</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="animate-fade-in p-10 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-secondary ring-1 ring-border">
                <Clock className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">Link Expirado</h2>
              <p className="leading-relaxed text-muted-foreground">
                Este enlace ya no es valido. Contacta al local para mas informacion.
              </p>
            </div>
          )}

          {/* Already decided */}
          {state === "already_decided" && (
            <div className="animate-fade-in p-10 text-center">
              <div className={`mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full ${
                finalDecision === "approved"
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-secondary text-muted-foreground ring-1 ring-border"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="h-9 w-9" />
                ) : (
                  <XCircle className="h-9 w-9" />
                )}
              </div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
                {finalDecision === "approved" ? "Ya Aprobada" : "Ya Rechazada"}
              </h2>
              <p className="text-muted-foreground">
                Esta reparacion ya fue {finalDecision === "approved" ? "aprobada" : "rechazada"}.
              </p>
            </div>
          )}

          {/* Ready - Show repair info */}
          {state === "ready" && repair && (
            <div className="animate-fade-in">
              {/* Info del equipo */}
              <div className="p-6">
                <div className="mb-6 flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary ring-1 ring-border">
                    <Smartphone className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Reparacion</p>
                    <p className="truncate font-semibold text-foreground">{repair.tipoReparacion}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="hairline-b flex items-center justify-between py-3.5">
                    <span className="text-sm text-muted-foreground">Cliente</span>
                    <span className="font-medium text-foreground">{repair.clienteNombre}</span>
                  </div>

                  {repair.serialImei && (
                    <div className="flex items-center justify-between py-3.5">
                      <span className="text-sm text-muted-foreground">IMEI/Serial</span>
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-sm tabular-nums text-foreground/90 ring-1 ring-border">
                        {repair.serialImei}
                      </span>
                    </div>
                  )}
                </div>

                {/* Precio destacado */}
                <div className="mt-6 overflow-hidden rounded-2xl bg-secondary p-5 text-center ring-1 ring-border">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Valor a cobrar</p>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {formatMoney(repair.valorACobrar)}
                  </p>
                </div>
              </div>

              {/* Botones de decision */}
              <div className="hairline-t p-6">
                <p className="mb-5 text-center font-medium text-foreground">
                  ¿Deseas aprobar esta reparacion?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="pressable rounded-2xl bg-secondary px-6 py-4 font-semibold text-secondary-foreground ring-1 ring-border transition-colors duration-base ease-out-quint hover:bg-accent"
                  >
                    No aprobar
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="pressable rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-e1 transition-colors duration-base ease-out-quint hover:brightness-105"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirming */}
          {state === "confirming" && (
            <div className="animate-scale-in p-8">
              <div className="mb-8 text-center">
                <div className={`mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full ${
                  pendingDecision === "approved"
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-secondary text-muted-foreground ring-1 ring-border"
                }`}>
                  {pendingDecision === "approved" ? (
                    <CheckCircle className="h-9 w-9" />
                  ) : (
                    <XCircle className="h-9 w-9" />
                  )}
                </div>
                <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
                  Confirmar {pendingDecision === "approved" ? "Aprobacion" : "Rechazo"}
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  {pendingDecision === "approved"
                    ? "Se iniciara la reparacion de tu equipo."
                    : "No se realizara la reparacion."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelConfirm}
                  className="pressable rounded-2xl bg-secondary px-6 py-4 font-semibold text-secondary-foreground ring-1 ring-border transition-colors duration-base ease-out-quint hover:bg-accent"
                >
                  Volver
                </button>
                <button
                  onClick={confirmDecision}
                  className={`pressable rounded-2xl px-6 py-4 font-semibold transition-colors duration-base ease-out-quint ${
                    pendingDecision === "approved"
                      ? "bg-primary text-primary-foreground shadow-e1 hover:brightness-105"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="animate-scale-in p-10 text-center">
              <div className={`mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full ${
                finalDecision === "approved"
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30 shadow-accent"
                  : "bg-secondary text-muted-foreground ring-1 ring-border"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="h-11 w-11" />
                ) : (
                  <XCircle className="h-11 w-11" />
                )}
              </div>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
                {finalDecision === "approved" ? "Aprobado!" : "Rechazado"}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {finalDecision === "approved"
                  ? "Gracias por tu confianza. Te avisaremos cuando tu equipo este listo para recoger."
                  : "Entendido. Si deseas explorar otras opciones, contacta al local."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="animate-fade-in mt-8 flex flex-col items-center gap-1 text-center">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Mister Manzana Reparaciones
          </p>
          <p className="text-xs text-muted-foreground/70">
            Servicio tecnico especializado en Apple
          </p>
        </div>
      </div>
    </div>
  );
}

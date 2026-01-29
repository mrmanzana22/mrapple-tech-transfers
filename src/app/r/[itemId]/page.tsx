"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Smartphone } from "lucide-react";
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
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header con Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-zinc-800 rounded-3xl shadow-2xl mb-4 p-2">
            <Image
              src="/logo.png"
              alt="Mister Manzana"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Mister Manzana
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Reparaciones</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Loading */}
          {state === "loading" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-full mb-4">
                <Loader2 className="w-8 h-8 text-zinc-800 animate-spin" />
              </div>
              <p className="text-zinc-500 font-medium">Cargando informacion...</p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-100 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-zinc-800" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Oops!</h2>
              <p className="text-zinc-500">{error}</p>
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-100 rounded-full mb-4">
                <Clock className="w-10 h-10 text-zinc-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Link Expirado</h2>
              <p className="text-zinc-500">
                Este enlace ya no es valido. Contacta al local para mas informacion.
              </p>
            </div>
          )}

          {/* Already decided */}
          {state === "already_decided" && (
            <div className="p-10 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                finalDecision === "approved" ? "bg-zinc-900" : "bg-zinc-200"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : (
                  <XCircle className="w-10 h-10 text-zinc-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">
                {finalDecision === "approved" ? "Ya Aprobada" : "Ya Rechazada"}
              </h2>
              <p className="text-zinc-500">
                Esta reparacion ya fue {finalDecision === "approved" ? "aprobada" : "rechazada"}.
              </p>
            </div>
          )}

          {/* Ready - Show repair info */}
          {state === "ready" && repair && (
            <>
              {/* Info del equipo */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Reparacion</p>
                    <p className="font-semibold text-zinc-900">{repair.tipoReparacion}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                    <span className="text-zinc-500">Cliente</span>
                    <span className="font-medium text-zinc-900">{repair.clienteNombre}</span>
                  </div>

                  {repair.serialImei && (
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                      <span className="text-zinc-500">IMEI/Serial</span>
                      <span className="font-mono text-sm text-zinc-700 bg-zinc-100 px-2 py-1 rounded">
                        {repair.serialImei}
                      </span>
                    </div>
                  )}
                </div>

                {/* Precio destacado */}
                <div className="mt-6 p-4 bg-zinc-900 rounded-2xl text-center">
                  <p className="text-zinc-400 text-sm mb-1">Valor a cobrar</p>
                  <p className="text-3xl font-bold text-white">
                    {formatMoney(repair.valorACobrar)}
                  </p>
                </div>
              </div>

              {/* Botones de decision */}
              <div className="p-6 border-t border-zinc-100">
                <p className="text-center text-zinc-600 mb-5 font-medium">
                  ¿Deseas aprobar esta reparacion?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="py-4 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-2xl transition-all duration-200 active:scale-95"
                  >
                    No aprobar
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="py-4 px-6 bg-zinc-900 hover:bg-black text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg active:scale-95"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Confirming */}
          {state === "confirming" && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  pendingDecision === "approved" ? "bg-zinc-900" : "bg-zinc-200"
                }`}>
                  {pendingDecision === "approved" ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                  ) : (
                    <XCircle className="w-10 h-10 text-zinc-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">
                  Confirmar {pendingDecision === "approved" ? "Aprobacion" : "Rechazo"}
                </h2>
                <p className="text-zinc-500">
                  {pendingDecision === "approved"
                    ? "Se iniciara la reparacion de tu equipo."
                    : "No se realizara la reparacion."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelConfirm}
                  className="py-4 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-2xl transition-all duration-200 active:scale-95"
                >
                  Volver
                </button>
                <button
                  onClick={confirmDecision}
                  className={`py-4 px-6 font-semibold rounded-2xl transition-all duration-200 active:scale-95 ${
                    pendingDecision === "approved"
                      ? "bg-zinc-900 hover:bg-black text-white shadow-lg"
                      : "bg-zinc-700 hover:bg-zinc-800 text-white"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="p-10 text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
                finalDecision === "approved"
                  ? "bg-zinc-900"
                  : "bg-zinc-300"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-zinc-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-3">
                {finalDecision === "approved" ? "Aprobado!" : "Rechazado"}
              </h2>
              <p className="text-zinc-500 leading-relaxed">
                {finalDecision === "approved"
                  ? "Gracias por tu confianza. Te avisaremos cuando tu equipo este listo para recoger."
                  : "Entendido. Si deseas explorar otras opciones, contacta al local."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-zinc-600 text-xs">
            Mister Manzana Reparaciones
          </p>
          <p className="text-zinc-700 text-xs mt-1">
            Servicio tecnico especializado en Apple
          </p>
        </div>
      </div>
    </div>
  );
}

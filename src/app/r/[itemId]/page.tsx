"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Smartphone, Apple } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header con Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg shadow-emerald-200 mb-4">
            <Apple className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Mister Manzana
          </h1>
          <p className="text-gray-500 text-sm font-medium">Reparaciones</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/50">
          {/* Loading */}
          {state === "loading" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <p className="text-gray-500 font-medium">Cargando informacion...</p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
              <p className="text-gray-500">{error}</p>
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expirado</h2>
              <p className="text-gray-500">
                Este enlace ya no es valido. Contacta al local para mas informacion.
              </p>
            </div>
          )}

          {/* Already decided */}
          {state === "already_decided" && (
            <div className="p-10 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                finalDecision === "approved" ? "bg-emerald-100" : "bg-red-100"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {finalDecision === "approved" ? "Ya Aprobada" : "Ya Rechazada"}
              </h2>
              <p className="text-gray-500">
                Esta reparacion ya fue {finalDecision === "approved" ? "aprobada" : "rechazada"}.
              </p>
            </div>
          )}

          {/* Ready - Show repair info */}
          {state === "ready" && repair && (
            <>
              {/* Info del equipo */}
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reparacion</p>
                    <p className="font-semibold text-gray-900">{repair.tipoReparacion}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Cliente</span>
                    <span className="font-medium text-gray-900">{repair.clienteNombre}</span>
                  </div>

                  {repair.serialImei && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">IMEI/Serial</span>
                      <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {repair.serialImei}
                      </span>
                    </div>
                  )}
                </div>

                {/* Precio destacado */}
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-center">
                  <p className="text-emerald-100 text-sm mb-1">Valor a cobrar</p>
                  <p className="text-3xl font-bold text-white">
                    {formatMoney(repair.valorACobrar)}
                  </p>
                </div>
              </div>

              {/* Botones de decision */}
              <div className="p-6 border-t border-gray-100">
                <p className="text-center text-gray-600 mb-5 font-medium">
                  ¿Deseas aprobar esta reparacion?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all duration-200 active:scale-95"
                  >
                    No aprobar
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-200 active:scale-95"
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
                  pendingDecision === "approved" ? "bg-emerald-100" : "bg-red-100"
                }`}>
                  {pendingDecision === "approved" ? (
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-500" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Confirmar {pendingDecision === "approved" ? "Aprobacion" : "Rechazo"}
                </h2>
                <p className="text-gray-500">
                  {pendingDecision === "approved"
                    ? "Se iniciara la reparacion de tu equipo."
                    : "No se realizara la reparacion."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelConfirm}
                  className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all duration-200 active:scale-95"
                >
                  Volver
                </button>
                <button
                  onClick={confirmDecision}
                  className={`py-4 px-6 font-semibold rounded-2xl transition-all duration-200 text-white active:scale-95 ${
                    pendingDecision === "approved"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200"
                      : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-200"
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
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                  : "bg-gradient-to-br from-red-400 to-rose-500"
              }`}>
                {finalDecision === "approved" ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {finalDecision === "approved" ? "Aprobado!" : "Rechazado"}
              </h2>
              <p className="text-gray-500 leading-relaxed">
                {finalDecision === "approved"
                  ? "Gracias por tu confianza. Te avisaremos cuando tu equipo este listo para recoger."
                  : "Entendido. Si deseas explorar otras opciones, contacta al local."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-xs">
            Mister Manzana Reparaciones
          </p>
          <p className="text-gray-300 text-xs mt-1">
            Servicio tecnico especializado en Apple
          </p>
        </div>
      </div>
    </div>
  );
}

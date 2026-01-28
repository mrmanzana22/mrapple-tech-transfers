"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

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
      setError("Link inválido");
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
      setError("Error de conexión");
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
      setError("Error de conexión");
      setState("error");
    }
  }

  function cancelConfirm() {
    setPendingDecision(null);
    setState("ready");
  }

  // Format currency
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">MrApple</h1>
          <p className="text-gray-500 text-sm">Aprobación de reparación</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Loading */}
          {state === "loading" && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">Cargando...</p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
              <p className="mt-2 text-gray-500">{error}</p>
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="p-8 text-center">
              <Clock className="w-16 h-16 text-orange-500 mx-auto" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Link expirado</h2>
              <p className="mt-2 text-gray-500">
                Este link ya no es válido. Por favor contacta al local para más información.
              </p>
            </div>
          )}

          {/* Already decided */}
          {state === "already_decided" && (
            <div className="p-8 text-center">
              {finalDecision === "approved" ? (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              )}
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {finalDecision === "approved" ? "Ya aprobada" : "Ya rechazada"}
              </h2>
              <p className="mt-2 text-gray-500">
                Esta reparación ya fue {finalDecision === "approved" ? "aprobada" : "rechazada"}.
              </p>
            </div>
          )}

          {/* Ready - Show repair info */}
          {state === "ready" && repair && (
            <>
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Cliente</span>
                  <span className="font-medium">{repair.clienteNombre}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">Reparación</span>
                  <span className="font-medium">{repair.tipoReparacion}</span>
                </div>
                {repair.serialImei && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">IMEI/Serial</span>
                    <span className="font-mono text-sm">{repair.serialImei}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Valor a cobrar</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatMoney(repair.valorACobrar)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <p className="text-center text-gray-600 mb-6">
                  ¿Desea aprobar esta reparación?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleDecision("rejected")}
                    className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                  >
                    No aprobar
                  </button>
                  <button
                    onClick={() => handleDecision("approved")}
                    className="py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Aprobar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Confirming */}
          {state === "confirming" && (
            <div className="p-6">
              <div className="text-center mb-6">
                {pendingDecision === "approved" ? (
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                )}
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  ¿Confirmar {pendingDecision === "approved" ? "aprobación" : "rechazo"}?
                </h2>
                <p className="mt-2 text-gray-500">
                  {pendingDecision === "approved"
                    ? "Se iniciará la reparación de su equipo."
                    : "No se realizará la reparación."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={cancelConfirm}
                  className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={confirmDecision}
                  className={`py-4 px-6 font-semibold rounded-xl transition-colors text-white ${
                    pendingDecision === "approved"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="p-8 text-center">
              {finalDecision === "approved" ? (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              )}
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {finalDecision === "approved" ? "¡Aprobado!" : "Rechazado"}
              </h2>
              <p className="mt-2 text-gray-500">
                {finalDecision === "approved"
                  ? "Gracias. Te avisaremos cuando tu equipo esté listo."
                  : "Entendido. Si deseas otra opción, contacta al local."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          MrApple - Servicio técnico especializado
        </p>
      </div>
    </div>
  );
}

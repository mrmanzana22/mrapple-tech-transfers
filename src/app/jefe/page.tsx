"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Users, Camera, Phone, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { TecnicoMetrics } from "@/types";

const SUPABASE_URL = "https://mhvzpetucfdjkvutmpen.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odnpwZXR1Y2Zkamt2dXRtcGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDI1MTgsImV4cCI6MjA4Mjg3ODUxOH0.PtUS0tuyXGUeKew2U-FxYIjfvaLsBByQYxxyONEcLOs";

async function fetchMetrics(mes: string): Promise<TecnicoMetrics[]> {
  // Obtener todos los técnicos
  const tecnicosRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mrapple_tecnicos?rol=eq.tecnico&activo=eq.true&select=nombre`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const tecnicos = await tecnicosRes.json();

  // Obtener transferencias del mes
  const startDate = `${mes}-01`;
  const endDate = `${mes}-31`;

  const logsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mrapple_transfer_logs?created_at=gte.${startDate}&created_at=lte.${endDate}T23:59:59&select=tecnico_origen,tiene_foto`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  const logs = await logsRes.json();

  // Calcular métricas por técnico
  const metrics: TecnicoMetrics[] = tecnicos.map((t: { nombre: string }) => {
    const tecnicoLogs = logs.filter((l: { tecnico_origen: string }) =>
      l.tecnico_origen === t.nombre
    );
    const conFoto = tecnicoLogs.filter((l: { tiene_foto: boolean }) => l.tiene_foto).length;
    const total = tecnicoLogs.length;

    return {
      nombre: t.nombre,
      total_transferencias: total,
      con_foto: conFoto,
      sin_foto: total - conFoto,
      porcentaje_foto: total > 0 ? Math.round((conFoto / total) * 100) : 0,
    };
  });

  // Ordenar por total de transferencias
  return metrics.sort((a, b) => b.total_transferencias - a.total_transferencias);
}

export default function JefePage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading, logout } = useAuth();

  const [metrics, setMetrics] = useState<TecnicoMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Redirect if not authenticated or not jefe
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
    if (!authLoading && isAuthenticated && tecnico?.rol !== "jefe") {
      router.push("/tecnico");
    }
  }, [authLoading, isAuthenticated, tecnico, router]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMetrics(selectedMonth);
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (isAuthenticated && tecnico?.rol === "jefe") {
      loadMetrics();
    }
  }, [isAuthenticated, tecnico, loadMetrics]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  // Totales
  const totals = metrics.reduce(
    (acc, m) => ({
      transferencias: acc.transferencias + m.total_transferencias,
      conFoto: acc.conFoto + m.con_foto,
    }),
    { transferencias: 0, conFoto: 0 }
  );

  // Loading state
  if (authLoading || !isAuthenticated || tecnico?.rol !== "jefe") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const monthName = new Date(selectedMonth + "-01").toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Dashboard Jefe</h1>
                <p className="text-xs text-zinc-400">{tecnico?.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadMetrics}
                disabled={isLoading}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-zinc-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-zinc-400 text-sm capitalize">{monthName}</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Total Transferencias</span>
            </div>
            <p className="text-2xl font-bold text-white">{totals.transferencias}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-400">Con Foto</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {totals.conFoto}
              <span className="text-sm text-zinc-400 ml-1">
                ({totals.transferencias > 0 ? Math.round((totals.conFoto / totals.transferencias) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Rendimiento por Técnico</h2>
          </div>

          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              No hay datos para este mes
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {metrics.map((m, idx) => (
                <div
                  key={m.nombre}
                  className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-400"
                          : idx === 1
                          ? "bg-zinc-400/20 text-zinc-300"
                          : idx === 2
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{m.nombre}</p>
                      <p className="text-xs text-zinc-400">
                        {m.con_foto} con foto / {m.sin_foto} sin foto
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{m.total_transferencias}</p>
                    <div className="flex items-center gap-1 justify-end">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          m.porcentaje_foto >= 80
                            ? "bg-green-400"
                            : m.porcentaje_foto >= 50
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span className="text-xs text-zinc-400">{m.porcentaje_foto}% foto</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

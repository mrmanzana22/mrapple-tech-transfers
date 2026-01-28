"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  RefreshCw,
  Users,
  Camera,
  Phone,
  Calendar,
  TrendingUp,
  BarChart3,
  UserCircle,
  Percent,
  Activity,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, LineChart, PieChart, TrendIndicator } from "@/components/charts";
import { getReparacionesCliente, fetchTecnicosActivos } from "@/lib/api";
import {
  fetchMetricsWithTrends,
  fetchDashboardTotals,
  fetchWeeklyData,
  fetchTecnicoHistorial,
  fetchMonthlyTrend,
} from "@/lib/jefe-api";
import type {
  TecnicoMetricsExtended,
  DashboardTotals,
  WeeklyData,
  TecnicoHistorial,
  ReparacionCliente,
} from "@/types";

type TabType = "overview" | "analytics" | "detalle" | "clientes";

export default function JefePage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading, logout } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [metrics, setMetrics] = useState<TecnicoMetricsExtended[]>([]);
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<
    { mes: string; transferencias: number; con_foto: number }[]
  >([]);
  const [selectedTecnico, setSelectedTecnico] = useState<string>("");
  const [tecnicoHistorial, setTecnicoHistorial] = useState<TecnicoHistorial | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Clientes state
  const [clientesData, setClientesData] = useState<{ tecnico: string; reparaciones: ReparacionCliente[] }[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesTotals, setClientesTotals] = useState({
    total: 0,
    pendientes: 0,
    reparados: 0,
    entregados: 0,
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

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsData, totalsData, weekly, monthly] = await Promise.all([
        fetchMetricsWithTrends(selectedMonth),
        fetchDashboardTotals(selectedMonth),
        fetchWeeklyData(selectedMonth),
        fetchMonthlyTrend(6),
      ]);
      setMetrics(metricsData);
      setTotals(totalsData);
      setWeeklyData(weekly);
      setMonthlyTrend(monthly);

      // Set default selected tecnico
      if (metricsData.length > 0 && !selectedTecnico) {
        setSelectedTecnico(metricsData[0].nombre);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedTecnico]);

  // Load tecnico historial when selected
  useEffect(() => {
    if (selectedTecnico && activeTab === "detalle") {
      fetchTecnicoHistorial(selectedTecnico, 6).then(setTecnicoHistorial);
    }
  }, [selectedTecnico, activeTab]);

  useEffect(() => {
    if (isAuthenticated && tecnico?.rol === "jefe") {
      loadData();
    }
  }, [isAuthenticated, tecnico, loadData]);

  // Load clientes data
  const loadClientesData = useCallback(async () => {
    setClientesLoading(true);
    try {
      const tecnicos = await fetchTecnicosActivos();
      const results = await Promise.all(
        tecnicos.map(async (nombre) => {
          const response = await getReparacionesCliente(nombre);
          return {
            tecnico: nombre,
            reparaciones: response.success ? (response.data ?? []) : [],
          };
        })
      );

      // Calcular totales
      let total = 0, pendientes = 0, reparados = 0, entregados = 0;
      results.forEach(r => {
        r.reparaciones.forEach(rep => {
          total++;
          const estado = rep.estado?.toLowerCase() || "";
          if (estado.includes("reparado")) reparados++;
          else if (estado.includes("entregado")) entregados++;
          else pendientes++;
        });
      });

      setClientesData(results.filter(r => r.reparaciones.length > 0));
      setClientesTotals({ total, pendientes, reparados, entregados });
    } catch (error) {
      console.error("Error loading clientes:", error);
    } finally {
      setClientesLoading(false);
    }
  }, []);

  // Load clientes data when tab is "clientes"
  useEffect(() => {
    if (activeTab === "clientes" && clientesData.length === 0) {
      loadClientesData();
    }
  }, [activeTab, clientesData.length, loadClientesData]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

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

  // Pie chart data for photo distribution
  const pieData = totals
    ? [
        { name: "Con Foto", value: totals.total_con_foto, color: "#22c55e" },
        { name: "Sin Foto", value: totals.total_sin_foto, color: "#ef4444" },
      ]
    : [];

  // Bar chart data for technicians
  const barData = metrics.slice(0, 5).map((m) => ({
    nombre: m.nombre,
    transferencias: m.total_transferencias,
  }));

  // Line chart config
  const lineChartLines = [
    { dataKey: "transferencias", color: "#3b82f6", name: "Total" },
    { dataKey: "con_foto", color: "#22c55e", name: "Con Foto" },
  ];

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
                onClick={loadData}
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

        {/* Tabs */}
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {[
            { id: "overview" as const, label: "Overview", icon: TrendingUp },
            { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
            { id: "detalle" as const, label: "Detalle", icon: UserCircle },
            { id: "clientes" as const, label: "Clientes", icon: Wrench },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && totals && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Transfers */}
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-zinc-400">Transferencias</span>
                      </div>
                      <TrendIndicator value={totals.vs_periodo_anterior} size="sm" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {totals.total_transferencias}
                    </p>
                  </div>

                  {/* With Photo */}
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-zinc-400">Con Foto</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {totals.total_con_foto}
                    </p>
                  </div>

                  {/* Without Photo */}
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-zinc-400">Sin Foto</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {totals.total_sin_foto}
                    </p>
                  </div>

                  {/* Photo Rate */}
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-zinc-400">% Fotos</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {totals.porcentaje_foto_global}%
                    </p>
                  </div>
                </div>

                {/* Technician Ranking */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">
                      Rendimiento por Técnico
                    </h2>
                  </div>
                  {metrics.length === 0 ? (
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
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white">{m.nombre}</p>
                                <TrendIndicator
                                  value={
                                    m.tendencia === "up"
                                      ? 5
                                      : m.tendencia === "down"
                                      ? -5
                                      : 0
                                  }
                                  size="sm"
                                />
                              </div>
                              <p className="text-xs text-zinc-400">
                                {m.con_foto} con foto / {m.sin_foto} sin foto •{" "}
                                {m.promedio_diario}/día
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-white">
                              {m.total_transferencias}
                            </p>
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
                              <span className="text-xs text-zinc-400">
                                {m.porcentaje_foto}% foto
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Charts Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Bar Chart - Top Technicians */}
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-4">
                      Top 5 Técnicos
                    </h3>
                    <div className="h-64">
                      <BarChart
                        data={barData}
                        dataKey="transferencias"
                        nameKey="nombre"
                        color="#3b82f6"
                      />
                    </div>
                  </div>

                  {/* Pie Chart - Photo Distribution */}
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-4">
                      Distribución de Fotos
                    </h3>
                    <div className="h-64">
                      <PieChart data={pieData} />
                    </div>
                  </div>
                </div>

                {/* Line Chart - Monthly Trend */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">
                    Tendencia Últimos 6 Meses
                  </h3>
                  <div className="h-72">
                    <LineChart
                      data={monthlyTrend}
                      lines={lineChartLines}
                      xAxisKey="mes"
                    />
                  </div>
                </div>

                {/* Daily Activity */}
                {weeklyData.length > 0 && (
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-4">
                      Actividad Diaria del Mes
                    </h3>
                    <div className="h-72">
                      <LineChart
                        data={weeklyData}
                        lines={[
                          {
                            dataKey: "transferencias",
                            color: "#8b5cf6",
                            name: "Transferencias",
                          },
                          { dataKey: "con_foto", color: "#22c55e", name: "Con Foto" },
                        ]}
                        xAxisKey="fecha"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detalle Tab */}
            {activeTab === "detalle" && (
              <div className="space-y-6">
                {/* Technician Selector */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Seleccionar Técnico
                  </label>
                  <select
                    value={selectedTecnico}
                    onChange={(e) => setSelectedTecnico(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {metrics.map((m) => (
                      <option key={m.nombre} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {tecnicoHistorial && (
                  <>
                    {/* Technician Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-zinc-400">
                            Total (6 meses)
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {tecnicoHistorial.metricas.total_transferencias}
                        </p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-zinc-400">Con Foto</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {tecnicoHistorial.metricas.con_foto}
                        </p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Percent className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-zinc-400">% Fotos</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {tecnicoHistorial.metricas.porcentaje_foto}%
                        </p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-zinc-400">Promedio/día</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {tecnicoHistorial.metricas.promedio_diario}
                        </p>
                      </div>
                    </div>

                    {/* Technician Evolution Chart */}
                    {tecnicoHistorial.por_dia.length > 0 && (
                      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <h3 className="text-sm font-medium text-zinc-300 mb-4">
                          Evolución de {selectedTecnico}
                        </h3>
                        <div className="h-72">
                          <LineChart
                            data={tecnicoHistorial.por_dia.slice(-30)}
                            lines={[
                              {
                                dataKey: "transferencias",
                                color: "#8b5cf6",
                                name: "Transferencias",
                              },
                              {
                                dataKey: "con_foto",
                                color: "#22c55e",
                                name: "Con Foto",
                              },
                            ]}
                            xAxisKey="fecha"
                          />
                        </div>
                      </div>
                    )}

                    {/* Recent Transfers */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="p-4 border-b border-zinc-800">
                        <h3 className="text-sm font-medium text-zinc-300">
                          Transferencias Recientes
                        </h3>
                      </div>
                      <div className="divide-y divide-zinc-800">
                        {tecnicoHistorial.transferencias_recientes.length === 0 ? (
                          <div className="p-4 text-center text-zinc-400">
                            No hay transferencias recientes
                          </div>
                        ) : (
                          tecnicoHistorial.transferencias_recientes.map((t) => (
                            <div
                              key={t.id}
                              className="p-4 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    t.tiene_foto
                                      ? "bg-green-500/20"
                                      : "bg-red-500/20"
                                  }`}
                                >
                                  <Camera
                                    className={`w-4 h-4 ${
                                      t.tiene_foto
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm text-white">
                                    {new Date(t.fecha).toLocaleDateString("es-MX", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  t.tiene_foto
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {t.tiene_foto ? "Con foto" : "Sin foto"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Clientes Tab */}
            {activeTab === "clientes" && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-zinc-400">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{clientesTotals.total}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-xs text-zinc-400">Pendientes</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{clientesTotals.pendientes}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs text-zinc-400">Reparados</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{clientesTotals.reparados}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-xs text-zinc-400">Entregados</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{clientesTotals.entregados}</p>
                  </div>
                </div>

                {/* Header con refresh */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Reparaciones por Técnico</h2>
                  <button
                    onClick={loadClientesData}
                    disabled={clientesLoading}
                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${clientesLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Lista por técnico */}
                {clientesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-pulse">
                        <div className="h-6 w-32 bg-zinc-800 rounded" />
                      </div>
                    ))}
                  </div>
                ) : clientesData.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    No hay reparaciones de clientes este mes
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientesData.map((item) => (
                      <div key={item.tecnico} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <div className="p-4 border-b border-zinc-800">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-white">{item.tecnico}</p>
                            <span className="text-sm text-zinc-400">{item.reparaciones.length} reparaciones</span>
                          </div>
                        </div>
                        <div className="divide-y divide-zinc-800">
                          {item.reparaciones.map((rep) => (
                            <div key={rep.id} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm text-white">
                                  {rep.cliente_nombre} {rep.cliente_apellido}
                                </p>
                                <p className="text-xs text-zinc-400">
                                  {rep.tipo_reparacion} • {rep.imei?.slice(-8) || "Sin IMEI"}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                rep.estado?.toLowerCase().includes("reparado")
                                  ? "bg-green-500/20 text-green-400"
                                  : rep.estado?.toLowerCase().includes("entregado")
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}>
                                {rep.estado || "Pendiente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

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
import { Reveal } from "@/components/motion";
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
        fetchMonthlyTrend(),
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass sheen hairline-b">
        <div className="container mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary shadow-e1 ring-1 ring-border">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Dashboard Jefe
                </h1>
                <p className="text-xs text-muted-foreground">{tecnico?.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="pressable rounded-lg bg-secondary p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleLogout}
                className="pressable rounded-lg bg-secondary p-2 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-7">
        {/* Control bar — month selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="surface flex items-center gap-2.5 rounded-lg px-3 py-2 shadow-e1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground tabular-nums focus:outline-none [color-scheme:dark]"
            />
          </div>
          <span className="text-sm capitalize text-muted-foreground">{monthName}</span>
        </div>

        {/* Tabs — segmented control */}
        <div className="surface flex gap-1 rounded-xl p-1 shadow-e1">
          {[
            { id: "overview" as const, label: "Overview", icon: TrendingUp },
            { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
            { id: "detalle" as const, label: "Detalle", icon: UserCircle },
            { id: "clientes" as const, label: "Clientes", icon: Wrench },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-base ease-out-quint ${
                activeTab === tab.id
                  ? "bg-popover text-foreground shadow-e1 ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="flex justify-center p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && totals && (
              <div className="space-y-7">
                {/* KPI Cards */}
                <Reveal
                  className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                  stagger={0.07}
                  y={20}
                  immediate
                >
                  {/* Total Transfers */}
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                        <Phone className="h-4 w-4 text-foreground" />
                      </div>
                      <TrendIndicator value={totals.vs_periodo_anterior} size="sm" />
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {totals.total_transferencias}
                    </p>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      Transferencias
                    </span>
                  </div>

                  {/* With Photo */}
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                        <Camera className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {totals.total_con_foto}
                    </p>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      Con Foto
                    </span>
                  </div>

                  {/* Without Photo */}
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
                        <Camera className="h-4 w-4 text-destructive" />
                      </div>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {totals.total_sin_foto}
                    </p>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      Sin Foto
                    </span>
                  </div>

                  {/* Photo Rate */}
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                        <Percent className="h-4 w-4 text-foreground" />
                      </div>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {totals.porcentaje_foto_global}%
                    </p>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      % Fotos
                    </span>
                  </div>
                </Reveal>

                {/* Technician Ranking */}
                <Reveal className="surface overflow-hidden rounded-2xl shadow-e1" y={20}>
                  <div className="hairline-b px-5 py-4">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Rendimiento por Técnico
                    </h2>
                  </div>
                  {metrics.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      No hay datos para este mes
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {metrics.map((m, idx) => (
                        <div
                          key={m.nombre}
                          className="flex items-center justify-between px-5 py-4 transition-colors duration-base hover:bg-accent/40"
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                                idx === 0
                                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                                  : idx === 1
                                  ? "bg-secondary text-foreground ring-1 ring-border"
                                  : idx === 2
                                  ? "bg-secondary/70 text-muted-foreground ring-1 ring-border"
                                  : "bg-transparent text-muted-foreground ring-1 ring-border"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{m.nombre}</p>
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
                              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                {m.con_foto} con foto / {m.sin_foto} sin foto •{" "}
                                {m.promedio_diario}/día
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-semibold tabular-nums text-foreground">
                              {m.total_transferencias}
                            </p>
                            <div className="mt-0.5 flex items-center justify-end gap-1.5">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  m.porcentaje_foto >= 80
                                    ? "bg-primary"
                                    : m.porcentaje_foto >= 50
                                    ? "bg-amber-400"
                                    : "bg-destructive"
                                }`}
                              />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {m.porcentaje_foto}% foto
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Reveal>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Charts Grid */}
                <Reveal className="grid gap-6 md:grid-cols-2" stagger={0.08} y={20}>
                  {/* Bar Chart - Top Technicians */}
                  <div className="surface rounded-2xl p-5 shadow-e1">
                    <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
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
                  <div className="surface rounded-2xl p-5 shadow-e1">
                    <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
                      Distribución de Fotos
                    </h3>
                    <div className="h-64">
                      <PieChart data={pieData} />
                    </div>
                  </div>
                </Reveal>

                {/* Line Chart - Monthly Trend */}
                <Reveal className="surface rounded-2xl p-5 shadow-e1" y={20}>
                  <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
                    Tendencia Últimos 6 Meses
                  </h3>
                  <div className="h-72">
                    <LineChart
                      data={monthlyTrend}
                      lines={lineChartLines}
                      xAxisKey="mes"
                    />
                  </div>
                </Reveal>

                {/* Daily Activity */}
                {weeklyData.length > 0 && (
                  <Reveal className="surface rounded-2xl p-5 shadow-e1" y={20}>
                    <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
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
                  </Reveal>
                )}
              </div>
            )}

            {/* Detalle Tab */}
            {activeTab === "detalle" && (
              <div className="space-y-6">
                {/* Technician Selector */}
                <div className="surface rounded-2xl p-5 shadow-e1">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Seleccionar Técnico
                  </label>
                  <select
                    value={selectedTecnico}
                    onChange={(e) => setSelectedTecnico(e.target.value)}
                    className="w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm text-foreground transition-colors duration-base focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 [color-scheme:dark]"
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
                    <Reveal
                      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                      stagger={0.07}
                      y={20}
                    >
                      <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                          <Activity className="h-4 w-4 text-foreground" />
                        </div>
                        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                          {tecnicoHistorial.metricas.total_transferencias}
                        </p>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          Total (6 meses)
                        </span>
                      </div>
                      <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                          <Camera className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                          {tecnicoHistorial.metricas.con_foto}
                        </p>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          Con Foto
                        </span>
                      </div>
                      <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                          <Percent className="h-4 w-4 text-foreground" />
                        </div>
                        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                          {tecnicoHistorial.metricas.porcentaje_foto}%
                        </p>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          % Fotos
                        </span>
                      </div>
                      <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                          <TrendingUp className="h-4 w-4 text-foreground" />
                        </div>
                        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                          {tecnicoHistorial.metricas.promedio_diario}
                        </p>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          Promedio/día
                        </span>
                      </div>
                    </Reveal>

                    {/* Technician Evolution Chart */}
                    {tecnicoHistorial.por_dia.length > 0 && (
                      <Reveal className="surface rounded-2xl p-5 shadow-e1" y={20}>
                        <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
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
                      </Reveal>
                    )}

                    {/* Recent Transfers */}
                    <Reveal className="surface overflow-hidden rounded-2xl shadow-e1" y={20}>
                      <div className="hairline-b px-5 py-4">
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">
                          Transferencias Recientes
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {tecnicoHistorial.transferencias_recientes.length === 0 ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            No hay transferencias recientes
                          </div>
                        ) : (
                          tecnicoHistorial.transferencias_recientes.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between px-5 py-4 transition-colors duration-base hover:bg-accent/40"
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ${
                                    t.tiene_foto
                                      ? "bg-primary/10 ring-primary/20"
                                      : "bg-destructive/10 ring-destructive/20"
                                  }`}
                                >
                                  <Camera
                                    className={`h-4 w-4 ${
                                      t.tiene_foto
                                        ? "text-primary"
                                        : "text-destructive"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm text-foreground tabular-nums">
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
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  t.tiene_foto
                                    ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {t.tiene_foto ? "Con foto" : "Sin foto"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </Reveal>
                  </>
                )}
              </div>
            )}

            {/* Clientes Tab */}
            {activeTab === "clientes" && (
              <div className="space-y-6">
                {/* KPIs */}
                <Reveal
                  className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                  stagger={0.07}
                  y={20}
                  immediate
                >
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary ring-1 ring-border">
                      <Wrench className="h-4 w-4 text-foreground" />
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {clientesTotals.total}
                    </p>
                    <span className="mt-1 block text-xs font-medium text-muted-foreground">
                      Total
                    </span>
                  </div>
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Pendientes
                      </span>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {clientesTotals.pendientes}
                    </p>
                  </div>
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Reparados
                      </span>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {clientesTotals.reparados}
                    </p>
                  </div>
                  <div className="surface card-hover rounded-2xl p-5 shadow-e1">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Entregados
                      </span>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {clientesTotals.entregados}
                    </p>
                  </div>
                </Reveal>

                {/* Header con refresh */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Reparaciones por Técnico
                  </h2>
                  <button
                    onClick={loadClientesData}
                    disabled={clientesLoading}
                    className="pressable rounded-lg bg-secondary p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${clientesLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Lista por técnico */}
                {clientesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="surface skeleton-shimmer rounded-2xl p-5"
                      >
                        <div className="h-6 w-32 rounded bg-secondary" />
                      </div>
                    ))}
                  </div>
                ) : clientesData.length === 0 ? (
                  <div className="surface rounded-2xl py-12 text-center text-sm text-muted-foreground shadow-e1">
                    No hay reparaciones de clientes este mes
                  </div>
                ) : (
                  <Reveal className="space-y-4" stagger={0.06} y={20}>
                    {clientesData.map((item) => (
                      <div
                        key={item.tecnico}
                        className="surface overflow-hidden rounded-2xl shadow-e1"
                      >
                        <div className="hairline-b px-5 py-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{item.tecnico}</p>
                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
                              {item.reparaciones.length} reparaciones
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-border">
                          {item.reparaciones.map((rep) => (
                            <div
                              key={rep.id}
                              className="flex items-center justify-between px-5 py-4 transition-colors duration-base hover:bg-accent/40"
                            >
                              <div>
                                <p className="text-sm text-foreground">
                                  {rep.cliente_nombre} {rep.cliente_apellido}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                  {rep.tipo_reparacion} • {rep.imei?.slice(-8) || "Sin IMEI"}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  rep.estado?.toLowerCase().includes("reparado")
                                    ? "bg-primary/10 text-primary"
                                    : rep.estado?.toLowerCase().includes("entregado")
                                    ? "bg-sky-400/10 text-sky-400"
                                    : "bg-amber-400/10 text-amber-400"
                                }`}
                              >
                                {rep.estado || "Pendiente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Reveal>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

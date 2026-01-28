// API Layer for Jefe Dashboard
// All calls go through server-side API routes (no anon key in frontend)

import type {
  TecnicoMetricsExtended,
  DashboardTotals,
  WeeklyData,
  TecnicoHistorial,
} from "@/types";

// Fetch all dashboard data in one request
async function fetchDashboardData(mes: string): Promise<{
  metrics: TecnicoMetricsExtended[];
  totals: DashboardTotals;
  weekly: WeeklyData[];
  monthly: { mes: string; transferencias: number; con_foto: number }[];
} | null> {
  try {
    const res = await fetch(`/api/jefe/dashboard?mes=${mes}`, {
      credentials: "include",
      headers: { "X-Requested-With": "mrapple" },
    });
    const data = await res.json();
    if (data.success) {
      return data.data;
    }
    console.error("Dashboard fetch error:", data.error);
    return null;
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return null;
  }
}

// Cache for dashboard data to avoid refetching
let cachedDashboard: {
  mes: string;
  data: Awaited<ReturnType<typeof fetchDashboardData>>;
} | null = null;

async function getDashboardData(mes: string) {
  if (cachedDashboard?.mes === mes && cachedDashboard.data) {
    return cachedDashboard.data;
  }
  const data = await fetchDashboardData(mes);
  if (data) {
    cachedDashboard = { mes, data };
  }
  return data;
}

// Exported functions that match the old API
export async function fetchMetricsWithTrends(
  mes: string
): Promise<TecnicoMetricsExtended[]> {
  const data = await getDashboardData(mes);
  return data?.metrics || [];
}

export async function fetchDashboardTotals(mes: string): Promise<DashboardTotals> {
  const data = await getDashboardData(mes);
  return (
    data?.totals || {
      total_transferencias: 0,
      total_con_foto: 0,
      total_sin_foto: 0,
      porcentaje_foto_global: 0,
      tendencia: "stable" as const,
      vs_periodo_anterior: 0,
    }
  );
}

export async function fetchWeeklyData(mes: string): Promise<WeeklyData[]> {
  const data = await getDashboardData(mes);
  return data?.weekly || [];
}

export async function fetchMonthlyTrend(): Promise<
  { mes: string; transferencias: number; con_foto: number }[]
> {
  // Monthly trend is included in dashboard data
  const today = new Date();
  const mes = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const data = await getDashboardData(mes);
  return data?.monthly || [];
}

export async function fetchTecnicoHistorial(
  nombre: string,
  meses: number = 6
): Promise<TecnicoHistorial> {
  try {
    const res = await fetch(
      `/api/jefe/historial?tecnico=${encodeURIComponent(nombre)}&meses=${meses}`,
      {
        credentials: "include",
        headers: { "X-Requested-With": "mrapple" },
      }
    );
    const data = await res.json();
    if (data.success) {
      return data.data;
    }
    console.error("Historial fetch error:", data.error);
  } catch (error) {
    console.error("Historial fetch error:", error);
  }

  // Return empty historial on error
  return {
    tecnico_nombre: nombre,
    periodo: { inicio: "", fin: "" },
    metricas: {
      nombre,
      total_transferencias: 0,
      con_foto: 0,
      sin_foto: 0,
      porcentaje_foto: 0,
      tendencia: "stable",
      promedio_diario: 0,
      dias_activos: 0,
    },
    por_dia: [],
    transferencias_recientes: [],
  };
}

// Clear cache when month changes (called from page)
export function clearDashboardCache() {
  cachedDashboard = null;
}

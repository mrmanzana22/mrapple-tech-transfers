// API Layer for Jefe Dashboard
import { config } from "./config";
import type {
  TecnicoMetricsExtended,
  DashboardTotals,
  WeeklyData,
  TecnicoHistorial,
} from "@/types";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = config.supabase;

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

// Helper: Get month range
function getMonthRange(mes: string): { start: string; end: string } {
  const [year, month] = mes.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${mes}-01`,
    end: `${mes}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Helper: Get previous month
function getPreviousMonth(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

// Helper: Calculate trend
function calculateTrend(
  current: number,
  previous: number
): { tendencia: "up" | "down" | "stable"; cambio: number } {
  if (previous === 0) {
    return { tendencia: current > 0 ? "up" : "stable", cambio: 0 };
  }
  const cambio = ((current - previous) / previous) * 100;
  return {
    tendencia: cambio > 5 ? "up" : cambio < -5 ? "down" : "stable",
    cambio: Math.round(cambio * 10) / 10,
  };
}

// Fetch raw logs for a month
async function fetchLogsForMonth(
  mes: string
): Promise<{ tecnico_origen: string; tiene_foto: boolean; created_at: string }[]> {
  const { start, end } = getMonthRange(mes);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mrapple_transfer_logs?created_at=gte.${start}&created_at=lte.${end}T23:59:59&select=tecnico_origen,tiene_foto,created_at`,
    { headers: supabaseHeaders }
  );
  return res.json();
}

// Fetch active technicians
async function fetchTecnicos(): Promise<{ nombre: string }[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mrapple_tecnicos?rol=eq.tecnico&activo=eq.true&select=nombre`,
    { headers: supabaseHeaders }
  );
  return res.json();
}

// Main: Fetch metrics with trends
export async function fetchMetricsWithTrends(
  mes: string
): Promise<TecnicoMetricsExtended[]> {
  const prevMes = getPreviousMonth(mes);

  const [tecnicos, currentLogs, prevLogs] = await Promise.all([
    fetchTecnicos(),
    fetchLogsForMonth(mes),
    fetchLogsForMonth(prevMes),
  ]);

  return tecnicos
    .map((t) => {
      // Current month
      const tecnicoLogs = currentLogs.filter((l) => l.tecnico_origen === t.nombre);
      const conFoto = tecnicoLogs.filter((l) => l.tiene_foto).length;
      const total = tecnicoLogs.length;

      // Previous month
      const prevTecnicoLogs = prevLogs.filter((l) => l.tecnico_origen === t.nombre);
      const prevTotal = prevTecnicoLogs.length;

      // Days active (unique dates)
      const diasActivos = new Set(
        tecnicoLogs.map((l) => l.created_at.split("T")[0])
      ).size;

      const { tendencia } = calculateTrend(total, prevTotal);

      return {
        nombre: t.nombre,
        total_transferencias: total,
        con_foto: conFoto,
        sin_foto: total - conFoto,
        porcentaje_foto: total > 0 ? Math.round((conFoto / total) * 100) : 0,
        tendencia,
        promedio_diario: diasActivos > 0 ? Math.round(total / diasActivos) : 0,
        dias_activos: diasActivos,
      };
    })
    .sort((a, b) => b.total_transferencias - a.total_transferencias);
}

// Dashboard totals with trend
export async function fetchDashboardTotals(mes: string): Promise<DashboardTotals> {
  const prevMes = getPreviousMonth(mes);

  const [currentLogs, prevLogs] = await Promise.all([
    fetchLogsForMonth(mes),
    fetchLogsForMonth(prevMes),
  ]);

  const total = currentLogs.length;
  const conFoto = currentLogs.filter((l) => l.tiene_foto).length;
  const prevTotal = prevLogs.length;

  const { tendencia, cambio } = calculateTrend(total, prevTotal);

  return {
    total_transferencias: total,
    total_con_foto: conFoto,
    total_sin_foto: total - conFoto,
    porcentaje_foto_global: total > 0 ? Math.round((conFoto / total) * 100) : 0,
    tendencia,
    vs_periodo_anterior: cambio,
  };
}

// Weekly data for charts
export async function fetchWeeklyData(mes: string): Promise<WeeklyData[]> {
  const logs = await fetchLogsForMonth(mes);

  // Group by date
  const byDate: Record<
    string,
    { transferencias: number; con_foto: number; sin_foto: number }
  > = {};

  logs.forEach((l) => {
    const date = l.created_at.split("T")[0];
    if (!byDate[date]) {
      byDate[date] = { transferencias: 0, con_foto: 0, sin_foto: 0 };
    }
    byDate[date].transferencias++;
    if (l.tiene_foto) {
      byDate[date].con_foto++;
    } else {
      byDate[date].sin_foto++;
    }
  });

  // Convert to array and add day names
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, data]) => ({
      dia: dias[new Date(fecha).getDay()],
      fecha,
      ...data,
    }));
}

// Technician historical data
export async function fetchTecnicoHistorial(
  nombre: string,
  meses: number = 6
): Promise<TecnicoHistorial> {
  const today = new Date();
  const mesActual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // Get all months to fetch
  const mesesArray: string[] = [];
  let [year, month] = mesActual.split("-").map(Number);

  for (let i = 0; i < meses; i++) {
    mesesArray.push(`${year}-${String(month).padStart(2, "0")}`);
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  // Fetch all logs in parallel
  const allLogs = await Promise.all(mesesArray.map(fetchLogsForMonth));
  const tecnicoLogs = allLogs.flat().filter((l) => l.tecnico_origen === nombre);

  // Calculate metrics
  const total = tecnicoLogs.length;
  const conFoto = tecnicoLogs.filter((l) => l.tiene_foto).length;
  const diasActivos = new Set(
    tecnicoLogs.map((l) => l.created_at.split("T")[0])
  ).size;

  // Weekly data
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const byDate: Record<string, WeeklyData> = {};

  tecnicoLogs.forEach((l) => {
    const fecha = l.created_at.split("T")[0];
    if (!byDate[fecha]) {
      byDate[fecha] = {
        dia: dias[new Date(fecha).getDay()],
        fecha,
        transferencias: 0,
        con_foto: 0,
        sin_foto: 0,
      };
    }
    byDate[fecha].transferencias++;
    if (l.tiene_foto) {
      byDate[fecha].con_foto++;
    } else {
      byDate[fecha].sin_foto++;
    }
  });

  // Recent transfers (last 10)
  const sortedLogs = tecnicoLogs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Fetch recent transfer details
  const recentIds = sortedLogs.slice(0, 10);
  const transferenciasRecientes = recentIds.map((l, idx) => ({
    id: `transfer-${idx}`,
    telefono: "N/A", // We don't have phone data in logs
    fecha: l.created_at,
    tiene_foto: l.tiene_foto,
  }));

  return {
    tecnico_nombre: nombre,
    periodo: {
      inicio: mesesArray[mesesArray.length - 1] + "-01",
      fin: mesActual + "-31",
    },
    metricas: {
      nombre,
      total_transferencias: total,
      con_foto: conFoto,
      sin_foto: total - conFoto,
      porcentaje_foto: total > 0 ? Math.round((conFoto / total) * 100) : 0,
      tendencia: "stable" as const,
      promedio_diario: diasActivos > 0 ? Math.round(total / diasActivos) : 0,
      dias_activos: diasActivos,
    },
    por_dia: Object.values(byDate).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    transferencias_recientes: transferenciasRecientes,
  };
}

// Monthly aggregation for charts (last N months)
export async function fetchMonthlyTrend(
  meses: number = 6
): Promise<{ mes: string; transferencias: number; con_foto: number }[]> {
  const today = new Date();
  const mesesArray: string[] = [];
  let [year, month] = [today.getFullYear(), today.getMonth() + 1];

  for (let i = 0; i < meses; i++) {
    mesesArray.push(`${year}-${String(month).padStart(2, "0")}`);
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  const results = await Promise.all(
    mesesArray.reverse().map(async (mes) => {
      const logs = await fetchLogsForMonth(mes);
      return {
        mes: new Date(mes + "-01").toLocaleDateString("es-MX", {
          month: "short",
        }),
        transferencias: logs.length,
        con_foto: logs.filter((l) => l.tiene_foto).length,
      };
    })
  );

  return results;
}

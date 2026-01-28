// GET /api/jefe/dashboard?mes=YYYY-MM
// Returns all dashboard data: metrics, totals, weekly, monthly trend
// Protected: requires jefe role

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getSupabaseServer } from "@/lib/supabase-server";
import type {
  TecnicoMetricsExtended,
  DashboardTotals,
  WeeklyData,
} from "@/types";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// Helpers
function getMonthRange(mes: string): { start: string; end: string } {
  const [year, month] = mes.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${mes}-01`,
    end: `${mes}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getPreviousMonth(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

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

type LogRow = { tecnico_origen: string; tiene_foto: boolean; created_at: string };

async function fetchLogsForMonth(mes: string): Promise<LogRow[]> {
  const supabase = getSupabaseServer();
  const { start, end } = getMonthRange(mes);

  const { data, error } = await supabase
    .from("mrapple_transfer_logs")
    .select("tecnico_origen, tiene_foto, created_at")
    .gte("created_at", start)
    .lte("created_at", `${end}T23:59:59`);

  if (error) {
    console.error("fetchLogsForMonth error:", error);
    return [];
  }
  return data || [];
}

async function fetchTecnicos(): Promise<{ nombre: string }[]> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("mrapple_tecnicos")
    .select("nombre")
    .eq("rol", "tecnico")
    .eq("activo", true);

  if (error) {
    console.error("fetchTecnicos error:", error);
    return [];
  }
  return data || [];
}

export async function GET(req: NextRequest) {
  // Session check
  const session = await validateSession(req);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, req);
  }

  // Role check - only jefe
  if (session.rol !== "jefe") {
    const res = NextResponse.json(
      { success: false, code: "FORBIDDEN", error: "Solo para rol jefe" },
      { status: 403 }
    );
    return addCorsHeaders(res, req);
  }

  try {
    const mes = req.nextUrl.searchParams.get("mes");
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "mes requerido (YYYY-MM)" },
        { status: 400 }
      );
      return addCorsHeaders(res, req);
    }

    const prevMes = getPreviousMonth(mes);

    // Fetch all data in parallel
    const [tecnicos, currentLogs, prevLogs] = await Promise.all([
      fetchTecnicos(),
      fetchLogsForMonth(mes),
      fetchLogsForMonth(prevMes),
    ]);

    // Calculate metrics per technician
    const metrics: TecnicoMetricsExtended[] = tecnicos
      .map((t) => {
        const tecnicoLogs = currentLogs.filter((l) => l.tecnico_origen === t.nombre);
        const conFoto = tecnicoLogs.filter((l) => l.tiene_foto).length;
        const total = tecnicoLogs.length;
        const prevTecnicoLogs = prevLogs.filter((l) => l.tecnico_origen === t.nombre);
        const prevTotal = prevTecnicoLogs.length;
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

    // Calculate totals
    const total = currentLogs.length;
    const conFoto = currentLogs.filter((l) => l.tiene_foto).length;
    const prevTotal = prevLogs.length;
    const { tendencia, cambio } = calculateTrend(total, prevTotal);

    const totals: DashboardTotals = {
      total_transferencias: total,
      total_con_foto: conFoto,
      total_sin_foto: total - conFoto,
      porcentaje_foto_global: total > 0 ? Math.round((conFoto / total) * 100) : 0,
      tendencia,
      vs_periodo_anterior: cambio,
    };

    // Calculate weekly data
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const byDate: Record<string, { transferencias: number; con_foto: number; sin_foto: number }> = {};

    currentLogs.forEach((l) => {
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

    const weekly: WeeklyData[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, data]) => ({
        dia: dias[new Date(fecha).getDay()],
        fecha,
        ...data,
      }));

    // Calculate monthly trend (last 6 months)
    const mesesArray: string[] = [];
    let [year, month] = mes.split("-").map(Number);
    for (let i = 0; i < 6; i++) {
      mesesArray.push(`${year}-${String(month).padStart(2, "0")}`);
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
    }

    const monthlyLogs = await Promise.all(mesesArray.map(fetchLogsForMonth));
    const monthly = mesesArray.reverse().map((m, idx) => {
      const logs = monthlyLogs[5 - idx];
      return {
        mes: new Date(m + "-01").toLocaleDateString("es-MX", { month: "short" }),
        transferencias: logs.length,
        con_foto: logs.filter((l) => l.tiene_foto).length,
      };
    });

    const res = NextResponse.json({
      success: true,
      data: { metrics, totals, weekly, monthly },
    });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("Dashboard error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

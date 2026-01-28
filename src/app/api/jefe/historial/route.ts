// GET /api/jefe/historial?tecnico=NAME&meses=6
// Returns historical data for a specific technician
// Protected: requires jefe role

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { TecnicoHistorial, WeeklyData } from "@/types";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

function getMonthRange(mes: string): { start: string; end: string } {
  const [year, month] = mes.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${mes}-01`,
    end: `${mes}-${String(lastDay).padStart(2, "0")}`,
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
    const tecnico = req.nextUrl.searchParams.get("tecnico");
    const mesesParam = req.nextUrl.searchParams.get("meses") || "6";
    const meses = parseInt(mesesParam, 10);

    if (!tecnico) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "tecnico requerido" },
        { status: 400 }
      );
      return addCorsHeaders(res, req);
    }

    if (isNaN(meses) || meses < 1 || meses > 12) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "meses debe ser 1-12" },
        { status: 400 }
      );
      return addCorsHeaders(res, req);
    }

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
    const tecnicoLogs = allLogs.flat().filter((l) => l.tecnico_origen === tecnico);

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
    const sortedLogs = [...tecnicoLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const transferenciasRecientes = sortedLogs.slice(0, 10).map((l, idx) => ({
      id: `transfer-${idx}`,
      telefono: "N/A",
      fecha: l.created_at,
      tiene_foto: l.tiene_foto,
    }));

    const historial: TecnicoHistorial = {
      tecnico_nombre: tecnico,
      periodo: {
        inicio: mesesArray[mesesArray.length - 1] + "-01",
        fin: mesActual + "-31",
      },
      metricas: {
        nombre: tecnico,
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

    const res = NextResponse.json({ success: true, data: historial });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("Historial error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

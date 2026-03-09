import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { readTeamSummary } from "@/lib/live-snapshot";
import { getSupabaseServer } from "@/lib/supabase-server";

type EquipoResumen = {
  tecnico: string;
  phonesCount: number;
  repairsCount: number;
  updatedAt: string | null;
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  const session = await validateSession(request);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, request);
  }

  if (!(session.puede_ver_equipo || session.rol === "jefe")) {
    const res = NextResponse.json(
      { success: false, code: "FORBIDDEN", error: "No tienes permiso para ver el equipo" },
      { status: 403 }
    );
    return addCorsHeaders(res, request);
  }

  try {
    const liveSummary = await readTeamSummary();
    // Only use live summary if it's fresh (less than 10 minutes old)
    const MAX_SUMMARY_AGE_MS = 10 * 60 * 1000;
    const isFresh = liveSummary && liveSummary.length > 0 &&
      liveSummary.some((row) => {
        const age = Date.now() - new Date(row.updated_at).getTime();
        return age < MAX_SUMMARY_AGE_MS;
      });

    if (isFresh) {
      const res = NextResponse.json(
        liveSummary!.map((row) => ({
          tecnico: row.tecnico_nombre,
          phonesCount: row.phones_count,
          repairsCount: row.repairs_count,
          updatedAt: row.updated_at,
        }))
      );
      res.headers.set("X-Data-Source", "live");
      return addCorsHeaders(res, request);
    }

    // Fallback: return active technicians with zeroed counters
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("mrapple_tecnicos")
      .select("nombre")
      .eq("activo", true)
      .eq("rol", "tecnico")
      .order("nombre");

    if (error) {
      const res = NextResponse.json(
        { success: false, code: "DB_ERROR", error: "No se pudo cargar el equipo" },
        { status: 500 }
      );
      return addCorsHeaders(res, request);
    }

    const payload: EquipoResumen[] = (data || []).map((t) => ({
      tecnico: String(t.nombre || ""),
      phonesCount: 0,
      repairsCount: 0,
      updatedAt: null,
    }));

    const res = NextResponse.json(payload);
    res.headers.set("X-Data-Source", "fallback-tecnicos");
    return addCorsHeaders(res, request);
  } catch (error) {
    console.error("GET /api/live/equipo-resumen error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}


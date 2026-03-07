import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getSupabaseServer } from "@/lib/supabase-server";
import { refreshTeamSummary, upsertLivePhones, upsertLiveRepairs } from "@/lib/live-snapshot";
import type { Phone, ReparacionCliente } from "@/types";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || "https://appn8n-n8n.lx6zon.easypanel.host/webhook";
const N8N_TIMEOUT_MS = 10000;

async function fetchArray(url: string): Promise<unknown[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  const session = await validateSession(request);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, request);
  }

  if (session.rol !== "jefe") {
    const res = NextResponse.json(
      { success: false, code: "FORBIDDEN", error: "Solo jefe puede ejecutar warmup" },
      { status: 403 }
    );
    return addCorsHeaders(res, request);
  }

  try {
    const supabase = getSupabaseServer();
    const { data: tecnicos, error } = await supabase
      .from("mrapple_tecnicos")
      .select("nombre")
      .eq("activo", true)
      .eq("rol", "tecnico")
      .order("nombre");

    if (error) {
      const res = NextResponse.json(
        { success: false, error: "No se pudo leer técnicos" },
        { status: 500 }
      );
      return addCorsHeaders(res, request);
    }

    const names = (tecnicos || []).map((t) => String(t.nombre || "").trim()).filter(Boolean);
    const sourceTs = new Date().toISOString();
    const phones: Phone[] = [];
    const repairs: ReparacionCliente[] = [];

    for (const tecnico of names) {
      const [p, r] = await Promise.all([
        fetchArray(`${N8N_BASE}/tech-telefonos?tecnico=${encodeURIComponent(tecnico)}`),
        fetchArray(`${N8N_BASE}/tech-reparaciones?tecnico=${encodeURIComponent(tecnico)}`),
      ]);
      phones.push(...(p as Phone[]));
      repairs.push(...(r as ReparacionCliente[]));
    }

    await Promise.all([
      upsertLivePhones(phones, sourceTs),
      upsertLiveRepairs(repairs, sourceTs),
    ]);
    await refreshTeamSummary(sourceTs);

    const res = NextResponse.json({
      success: true,
      sourceTs,
      tecnicos: names.length,
      upserted: {
        phones: phones.length,
        repairs: repairs.length,
      },
    });
    return addCorsHeaders(res, request);
  } catch (err) {
    console.error("POST /api/live/sync/warmup error:", err);
    const res = NextResponse.json(
      { success: false, error: "Warmup falló" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}


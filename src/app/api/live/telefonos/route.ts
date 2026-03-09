import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { cache, CACHE_TTL } from "@/lib/cache";
import { isLiveSnapshotEnabled, readLivePhonesByTecnico, upsertLivePhones, refreshTeamSummary } from "@/lib/live-snapshot";
import type { Phone } from "@/types";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || "https://appn8n-n8n.lx6zon.easypanel.host/webhook";
const N8N_TIMEOUT_MS = 6000;
const STALE_TTL_MS = 5 * 60 * 1000;

async function fetchPhonesFromN8n(tecnicoQuery: string): Promise<unknown[]> {
  const url = `${N8N_BASE}/tech-telefonos?tecnico=${encodeURIComponent(tecnicoQuery)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(data?.error || "Error from n8n");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

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

  try {
    let tecnicoQuery: string;
    if (session.puede_ver_equipo || session.rol === "jefe") {
      const requestedTecnico = request.nextUrl.searchParams.get("tecnico");
      if (!requestedTecnico) {
        const res = NextResponse.json(
          { success: false, code: "BAD_REQUEST", error: "tecnico parameter required" },
          { status: 400 }
        );
        return addCorsHeaders(res, request);
      }
      tecnicoQuery = requestedTecnico;
    } else {
      tecnicoQuery = session.nombre;
    }

    const cacheKey = `live:telefonos:${tecnicoQuery}`;
    const staleKey = `${cacheKey}:stale`;
    const cached = cache.get<unknown[]>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      res.headers.set("X-Data-Source", "live-cache");
      return addCorsHeaders(res, request);
    }

    if (isLiveSnapshotEnabled()) {
      try {
        const liveData = await readLivePhonesByTecnico(tecnicoQuery);
        if (liveData !== null && liveData.length > 0) {
          cache.set(cacheKey, liveData, CACHE_TTL.TELEFONOS);
          cache.set(staleKey, liveData, STALE_TTL_MS);
          const res = NextResponse.json(liveData);
          res.headers.set("X-Cache", "MISS");
          res.headers.set("X-Data-Source", "live");
          return addCorsHeaders(res, request);
        }
      } catch (error) {
        console.error("live phones read error:", error);
      }
    }

    try {
      const n8nData = await fetchPhonesFromN8n(tecnicoQuery) as Phone[];
      cache.set(cacheKey, n8nData, CACHE_TTL.TELEFONOS);
      cache.set(staleKey, n8nData, STALE_TTL_MS);

      if (isLiveSnapshotEnabled()) {
        upsertLivePhones(n8nData).then(() => refreshTeamSummary()).catch((error) => {
          console.error("live phones upsert error:", error);
        });
      }

      const res = NextResponse.json(n8nData);
      res.headers.set("X-Cache", "MISS");
      res.headers.set("X-Data-Source", "n8n-fallback");
      return addCorsHeaders(res, request);
    } catch (error) {
      console.error("live phones n8n fallback error:", error);
      const stale = cache.get<unknown[]>(staleKey);
      if (stale) {
        const res = NextResponse.json(stale);
        res.headers.set("X-Cache", "STALE");
        res.headers.set("X-Data-Source", "stale-cache");
        return addCorsHeaders(res, request);
      }

      // Final fail-open fallback for UX: avoid blocking the page with 502s.
      const res = NextResponse.json([]);
      res.headers.set("X-Cache", "MISS");
      res.headers.set("X-Data-Source", "empty-fallback");
      return addCorsHeaders(res, request);
    }
  } catch (error) {
    console.error("GET /api/live/telefonos error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}

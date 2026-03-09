import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { cache, CACHE_TTL } from "@/lib/cache";
import { isLiveSnapshotEnabled, readLivePhonesByTecnico, upsertLivePhones, refreshTeamSummary } from "@/lib/live-snapshot";
import type { Phone } from "@/types";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || "https://appn8n-n8n.lx6zon.easypanel.host/webhook";
const N8N_TIMEOUT_MS = 20000;
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

    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
    const cacheKey = `live:telefonos:${tecnicoQuery}`;
    const staleKey = `${cacheKey}:stale`;

    if (!forceRefresh) {
      const cached = cache.get<unknown[]>(cacheKey);
      if (cached) {
        const res = NextResponse.json(cached);
        res.headers.set("X-Cache", "HIT");
        res.headers.set("X-Data-Source", "live-cache");
        return addCorsHeaders(res, request);
      }
    } else {
      // Clear this instance's cache so fresh data gets stored
      cache.invalidatePattern(`live:telefonos:${tecnicoQuery}`);
    }

    // Only use live snapshot when NOT force-refreshing
    // (refresh=1 means data changed, snapshot is stale — go to n8n for truth)
    if (!forceRefresh && isLiveSnapshotEnabled()) {
      try {
        const liveResult = await readLivePhonesByTecnico(tecnicoQuery);
        if (liveResult !== null) {
          cache.set(cacheKey, liveResult.data, CACHE_TTL.TELEFONOS);
          cache.set(staleKey, liveResult.data, STALE_TTL_MS);

          // Stale-while-revalidate: serve stale data immediately, refresh in background
          if (liveResult.isStale) {
            fetchPhonesFromN8n(tecnicoQuery).then((raw) => {
              const fresh = (raw as Phone[]).map(p => ({ ...p, tecnico: p.tecnico || tecnicoQuery }));
              cache.set(cacheKey, fresh, CACHE_TTL.TELEFONOS);
              cache.set(staleKey, fresh, STALE_TTL_MS);
              upsertLivePhones(fresh).then(() => refreshTeamSummary()).catch((e) => {
                console.error("stale-refresh phones upsert error:", e);
              });
            }).catch((e) => console.error("stale-refresh phones n8n error:", e));
          }

          const res = NextResponse.json(liveResult.data);
          res.headers.set("X-Cache", "MISS");
          res.headers.set("X-Data-Source", liveResult.isStale ? "live-stale" : "live");
          return addCorsHeaders(res, request);
        }
      } catch (error) {
        console.error("live phones read error:", error);
      }
    }

    // Stale in-memory cache: serve immediately, refresh in background
    const staleData = cache.get<unknown[]>(staleKey);
    if (staleData) {
      cache.set(cacheKey, staleData, CACHE_TTL.TELEFONOS);
      // Background refresh: n8n → caches + snapshot
      fetchPhonesFromN8n(tecnicoQuery).then(async (raw) => {
        const fresh = (raw as Phone[]).map(p => ({ ...p, tecnico: p.tecnico || tecnicoQuery }));
        cache.set(cacheKey, fresh, CACHE_TTL.TELEFONOS);
        cache.set(staleKey, fresh, STALE_TTL_MS);
        if (isLiveSnapshotEnabled()) {
          try { await upsertLivePhones(fresh); await refreshTeamSummary(); } catch {}
        }
      }).catch(() => {});
      const res = NextResponse.json(staleData);
      res.headers.set("X-Cache", "STALE");
      res.headers.set("X-Data-Source", "stale-swr");
      return addCorsHeaders(res, request);
    }

    try {
      const rawN8n = await fetchPhonesFromN8n(tecnicoQuery) as Phone[];
      // Ensure tecnico field is set (n8n may return empty for shared-group items)
      const n8nData = rawN8n.map(p => ({ ...p, tecnico: p.tecnico || tecnicoQuery }));
      cache.set(cacheKey, n8nData, CACHE_TTL.TELEFONOS);
      cache.set(staleKey, n8nData, STALE_TTL_MS);

      // Await upsert to guarantee snapshot is populated
      if (isLiveSnapshotEnabled()) {
        try {
          await upsertLivePhones(n8nData);
          await refreshTeamSummary();
        } catch (error) {
          console.error("live phones upsert error:", error);
        }
      }

      const res = NextResponse.json(n8nData);
      res.headers.set("X-Cache", "MISS");
      res.headers.set("X-Data-Source", "n8n-fallback");
      return addCorsHeaders(res, request);
    } catch (error) {
      console.error("live phones n8n fallback error:", error);

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

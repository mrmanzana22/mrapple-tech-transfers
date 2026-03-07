// GET /api/n8n/tech-reparaciones
// Returns client repairs assigned to the authenticated technician
// Protected: requires valid session
// Role filtering: tecnico sees only their repairs, jefe can query any
// Cached: 45s TTL to reduce n8n/Monday calls

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { cache, CACHE_TTL } from "@/lib/cache";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE || "https://appn8n-n8n.lx6zon.easypanel.host/webhook";
const N8N_TIMEOUT_MS = 6000;
const MAX_RETRIES = 1;
const STALE_TTL_MS = 5 * 60 * 1000; // 5 minutes fallback window

async function fetchReparacionesFromN8nWithRetry(tecnicoQuery: string): Promise<unknown[]> {
  const n8nUrl = `${N8N_BASE}/tech-reparaciones?tecnico=${encodeURIComponent(tecnicoQuery)}`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
      const n8nResponse = await fetch(n8nUrl, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await n8nResponse.json();

      if (Array.isArray(data)) {
        return data;
      }

      throw new Error(data?.error || "Error from n8n");
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("n8n fetch failed");
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
  // Session check
  const session = await validateSession(request);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, request);
  }

  try {
    // Determine which tecnico to query
    let tecnicoQuery: string;

    if (session.puede_ver_equipo || session.rol === "jefe") {
      // Users with puede_ver_equipo can query any tecnico via query param
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
      // Tecnico can only see their own repairs - ignore client param
      tecnicoQuery = session.nombre;
    }

    // Check cache first
    const cacheKey = `reparaciones:${tecnicoQuery}`;
    const staleKey = `${cacheKey}:stale`;
    const cached = cache.get<unknown[]>(cacheKey);

    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set("X-Cache", "HIT");
      return addCorsHeaders(res, request);
    }

    try {
      const data = await fetchReparacionesFromN8nWithRetry(tecnicoQuery);
      cache.set(cacheKey, data, CACHE_TTL.REPARACIONES);
      cache.set(staleKey, data, STALE_TTL_MS);
      const res = NextResponse.json(data);
      res.headers.set("X-Cache", "MISS");
      return addCorsHeaders(res, request);
    } catch (n8nError) {
      console.error("tech-reparaciones n8n fetch failed, trying stale cache:", n8nError);

      const stale = cache.get<unknown[]>(staleKey);
      if (stale) {
        const res = NextResponse.json(stale);
        res.headers.set("X-Cache", "STALE");
        return addCorsHeaders(res, request);
      }

      const res = NextResponse.json(
        { success: false, error: "No se pudo obtener reparaciones en este momento" },
        { status: 502 }
      );
      return addCorsHeaders(res, request);
    }
  } catch (error) {
    console.error("tech-reparaciones error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, request);
  }
}

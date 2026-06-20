// POST /api/n8n/tech-cambiar-estado
// Changes repair status in Monday
// Validates: session + CSRF + ownership in Monday (repairs board) + idempotency

import { NextRequest, NextResponse } from "next/server";
import { getOwnerTextForItem, OWNER_COLUMNS } from "@/lib/monday";
import { validateSession, validateCsrf, csrfError } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import {
  claimIdempotencyKey,
  markIdempotencySuccess,
  markIdempotencyFailed,
} from "@/lib/idempotency";
import { cache } from "@/lib/cache";
import { deleteLiveRepair } from "@/lib/live-snapshot";
import { getSupabaseServer } from "@/lib/supabase-server";

// Normaliza un nombre de dueño para comparar de forma robusta: sin acentos,
// sin espacios sobrantes, en mayúsculas. Evita falsos NOT_OWNER por
// "Sebastián" vs "SEBASTIAN" o por espacios extra en snapshot/Monday.
function normalizeOwner(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(req: NextRequest) {
  // CSRF check
  if (!validateCsrf(req)) {
    return addCorsHeaders(csrfError(), req);
  }

  // Session check
  const session = await validateSession(req);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, req);
  }

  const n8nBase = process.env.N8N_WEBHOOK_BASE;
  if (!n8nBase) {
    const res = NextResponse.json(
      { success: false, code: "CONFIG", error: "N8N_WEBHOOK_BASE missing" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }

  let requestId = "";
  try {
    const body = await req.json().catch(() => ({}));
    const itemId = String(body?.item_id ?? "").trim();
    requestId = String(body?.request_id ?? "").trim();

    if (!itemId) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "item_id requerido" },
        { status: 400 }
      );
      return addCorsHeaders(res, req);
    }

    // Idempotency check
    const idem = await claimIdempotencyKey(
      requestId,
      "repair_status",
      session.tecnico_id
    );

    if (idem.alreadyProcessed) {
      if (idem.status === "succeeded" && idem.response) {
        const res = NextResponse.json(idem.response);
        return addCorsHeaders(res, req);
      }
      const res = NextResponse.json(
        { success: false, code: "DUPLICATE", error: "Request already processing" },
        { status: 409 }
      );
      return addCorsHeaders(res, req);
    }

    // Ownership check
    // Primary: Supabase snapshot (mrapple_live_repairs) — rápido y sin depender de
    // Monday. Si el token de Monday se cae, NO debe tumbar todos los cambios.
    // Fallback: Monday GraphQL — cubre items aún no sincronizados o editados a mano.
    const sessionOwners = new Set(
      [session.monday_status_value, session.nombre]
        .map(normalizeOwner)
        .filter((v) => v !== "")
    );
    const matchesSession = (candidate: string | null | undefined): boolean => {
      const n = normalizeOwner(candidate);
      return n !== "" && sessionOwners.has(n);
    };

    const supabase = getSupabaseServer();
    const { data: snapshotRepair } = await supabase
      .from("mrapple_live_repairs")
      .select("tecnico_nombre")
      .eq("item_id", itemId)
      .maybeSingle();

    let isOwner = matchesSession(snapshotRepair?.tecnico_nombre);

    let mondayInfo: Awaited<ReturnType<typeof getOwnerTextForItem>> | null = null;
    let mondayCheckFailed = false;
    if (!isOwner) {
      // Un hiccup de Monday (rate-limit / token caído) NO debe tumbar la request al
      // catch externo (500): lo aislamos y devolvemos OWNERSHIP_UNVERIFIED (503).
      try {
        mondayInfo = await getOwnerTextForItem(itemId, OWNER_COLUMNS.REPAIRS);
        isOwner = matchesSession(mondayInfo.ownerText);

        // Tolera group titles tipo "JOCEBAN - MAYO 2026" tomando el primer token
        // antes de cualquier guion.
        if (!isOwner && mondayInfo.groupTitle) {
          isOwner = matchesSession(mondayInfo.groupTitle.split(/[-–—]/)[0]);
        }
      } catch (e) {
        mondayCheckFailed = true;
        console.error("ownership Monday check failed (cambiar-estado):", e);
      }
    }

    if (!isOwner) {
      // Distinguir "Monday no respondió" (reintentar) de "otro es el dueño" (no
      // reintentar). En ambos casos LIBERAMOS la idempotency key para que el
      // reintento no quede trabado en 409.
      const failJson = {
        success: false,
        code: mondayCheckFailed ? "OWNERSHIP_UNVERIFIED" : "NOT_OWNER",
        error: mondayCheckFailed
          ? "No se pudo verificar el dueño en este momento, intenta de nuevo"
          : "No eres el dueño de esta reparación",
        details: {
          item_id: itemId,
          owner_supabase: snapshotRepair?.tecnico_nombre ?? null,
          owner_monday: mondayInfo?.ownerText ?? null,
          owner_monday_group: mondayInfo?.groupTitle ?? null,
          owner_session: session.monday_status_value,
          owner_session_nombre: session.nombre,
          monday_check_failed: mondayCheckFailed,
        },
      };
      await markIdempotencyFailed(requestId, "repair_status", failJson);
      const res = NextResponse.json(failJson, {
        status: mondayCheckFailed ? 503 : 403,
      });
      return addCorsHeaders(res, req);
    }

    // Forward to n8n - DON'T trust tecnico_nombre from client
    const forward = {
      ...body,
      tecnico_nombre: session.nombre,
    };

    const n8nRes = await fetch(`${n8nBase}/tech-cambiar-estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forward),
      cache: "no-store",
    });

    const text = await n8nRes.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    // Mark idempotency result + invalidate cache
    if (n8nRes.ok && json.success !== false) {
      await markIdempotencySuccess(requestId, "repair_status", json);
      // Invalidate reparaciones cache
      cache.invalidatePattern("reparaciones:");
      // Drop the mutated item from the live snapshot so a racing refresh
      // (Monday not yet propagated) can't leave a stale row behind.
      try {
        await deleteLiveRepair(itemId);
      } catch (e) {
        console.error("deleteLiveRepair after cambiar-estado:", e);
      }
    } else {
      await markIdempotencyFailed(requestId, "repair_status", json);
    }

    const res = NextResponse.json(json, { status: n8nRes.status });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("tech-cambiar-estado error:", error);
    // Liberar la idempotency key: un fallo transitorio no debe dejar el item
    // trabado en 409 "Request already processing" en los reintentos.
    await markIdempotencyFailed(requestId, "repair_status", {
      success: false,
      code: "SERVER_ERROR",
      error: String(error),
    });
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

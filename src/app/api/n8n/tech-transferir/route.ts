// POST /api/n8n/tech-transferir
// Transfers a phone to another technician
// Validates: session + CSRF + ownership in Monday + idempotency

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
import { getSupabaseServer } from "@/lib/supabase-server";
import { isLiveSnapshotEnabled, refreshTeamSummary } from "@/lib/live-snapshot";

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

  try {
    const form = await req.formData();
    const itemId = String(form.get("item_id") ?? "").trim();
    const requestId = String(form.get("request_id") ?? "").trim();

    if (!itemId) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "item_id requerido" },
        { status: 400 }
      );
      return addCorsHeaders(res, req);
    }

    // Idempotency check - prevent duplicate processing
    const idem = await claimIdempotencyKey(
      requestId,
      "transfer_phone",
      session.tecnico_id
    );

    if (idem.alreadyProcessed) {
      if (idem.status === "succeeded" && idem.response) {
        // Return cached response
        const res = NextResponse.json(idem.response);
        return addCorsHeaders(res, req);
      }
      // Still processing from previous request
      const res = NextResponse.json(
        { success: false, code: "DUPLICATE", error: "Request already processing" },
        { status: 409 }
      );
      return addCorsHeaders(res, req);
    }

    // Ownership check
    // Primary: Supabase snapshot (mrapple_live_phones) — fast, no Monday rate-limit.
    // Fallback: Monday GraphQL — covers items not yet synced or edited manually in Monday.
    const sessionOwner = (session.monday_status_value || "").toUpperCase();
    const supabase = getSupabaseServer();

    const { data: snapshotPhone } = await supabase
      .from("mrapple_live_phones")
      .select("tecnico_nombre")
      .eq("item_id", itemId)
      .maybeSingle();

    const supabaseOwner = String(snapshotPhone?.tecnico_nombre ?? "").trim().toUpperCase();
    let isOwner = supabaseOwner !== "" && supabaseOwner === sessionOwner;

    let mondayInfo: Awaited<ReturnType<typeof getOwnerTextForItem>> | null = null;
    if (!isOwner) {
      mondayInfo = await getOwnerTextForItem(itemId, OWNER_COLUMNS.PHONES);
      const currentOwner = (mondayInfo.ownerText ?? "").trim();
      isOwner = currentOwner !== "" && currentOwner.toUpperCase() === sessionOwner;

      // Tolerate group titles like "JOCEBAN - MAYO 2026" / "JOCEBAN - JUNIO 2026"
      // by extracting the first token before any dash.
      if (!isOwner && mondayInfo.groupTitle) {
        const groupOwner = mondayInfo.groupTitle.split(/[-–—]/)[0].trim().toUpperCase();
        isOwner = groupOwner !== "" && groupOwner === sessionOwner;
      }
    }

    if (!isOwner) {
      const res = NextResponse.json(
        {
          success: false,
          code: "NOT_OWNER",
          error: "No eres el dueño de este teléfono",
          details: {
            item_id: itemId,
            owner_supabase: snapshotPhone?.tecnico_nombre ?? null,
            owner_monday: mondayInfo?.ownerText ?? null,
            owner_monday_group: mondayInfo?.groupTitle ?? null,
            owner_session: session.monday_status_value,
          },
        },
        { status: 403 }
      );
      return addCorsHeaders(res, req);
    }

    // Build clean FormData - DON'T trust client's tecnico_actual
    const forward = new FormData();

    // Copy allowed fields (including request_id for idempotency)
    const allowedFields = ["item_id", "nuevo_tecnico", "comentario", "request_id"];
    for (const key of allowedFields) {
      const v = form.get(key);
      if (v !== null && v !== undefined) forward.set(key, String(v));
    }

    // Photo if exists
    const foto = form.get("foto");
    if (foto instanceof File && foto.size > 0) {
      forward.set("foto", foto, foto.name);
    }

    // Override with session data (source of truth)
    forward.set("tecnico_actual", session.tecnico_id);
    forward.set("tecnico_actual_nombre", session.nombre);

    // Forward to n8n
    const n8nRes = await fetch(`${n8nBase}/tech-transferir`, {
      method: "POST",
      body: forward,
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
      await markIdempotencySuccess(requestId, "transfer_phone", json);
      // Invalidate cache for both origin and destination tecnico
      cache.invalidatePattern("telefonos:");

      // Sync live snapshot immediately so the receiver's next poll sees the phone
      // under the new owner without waiting for a background n8n resync.
      const nuevoTecnicoName = String(form.get("nuevo_tecnico") ?? "").trim();
      if (nuevoTecnicoName) {
        try {
          const { data: existing } = await supabase
            .from("mrapple_live_phones")
            .select("payload")
            .eq("item_id", itemId)
            .maybeSingle();

          if (existing?.payload) {
            const newPayload = {
              ...(existing.payload as Record<string, unknown>),
              tecnico: nuevoTecnicoName,
            };
            await supabase
              .from("mrapple_live_phones")
              .update({
                tecnico_nombre: nuevoTecnicoName,
                payload: newPayload,
                updated_at: new Date().toISOString(),
              })
              .eq("item_id", itemId);
          }

          // Recompute team summary so phones_count drops on origin and rises on
          // destination immediately. Without this, the count UIs stay stale.
          if (isLiveSnapshotEnabled()) {
            await refreshTeamSummary();
          }
        } catch (e) {
          console.error("live snapshot sync error (phones):", e);
        }
      }
    } else {
      await markIdempotencyFailed(requestId, "transfer_phone", json);
    }

    const res = NextResponse.json(json, { status: n8nRes.status });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("tech-transferir error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

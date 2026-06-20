// POST /api/n8n/tech-transferir-reparacion
// Transfers a repair to another technician
// Validates: session + CSRF + ownership in Monday (repairs board) + idempotency

import { NextRequest, NextResponse } from "next/server";
import { checkRepairOwnership } from "@/lib/repair-ownership";
import { validateSession, validateCsrf, csrfError } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import {
  claimIdempotencyKey,
  markIdempotencySuccess,
  markIdempotencyFailed,
} from "@/lib/idempotency";
import { cache } from "@/lib/cache";
import { deleteLiveRepair } from "@/lib/live-snapshot";

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
    const form = await req.formData();
    const itemId = String(form.get("item_id") ?? "").trim();
    requestId = String(form.get("request_id") ?? "").trim();

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
      "transfer_repair",
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

    // Ownership check — Monday es la ÚNICA fuente de verdad (columna estado_1).
    // Devuelve códigos claros: NOT_OWNER (de otro técnico), SIN_ASIGNAR (sin
    // técnico en Monday), ITEM_NO_EXISTE (movido/borrado) o ERROR_MONDAY (fallo
    // externo, con motivo). Siempre liberamos la idempotency key para que el
    // reintento no quede trabado en 409.
    const ownership = await checkRepairOwnership(itemId, {
      nombre: session.nombre,
      monday_status_value: session.monday_status_value,
    });

    if (!ownership.ok) {
      const failJson = {
        success: false,
        code: ownership.code,
        error: ownership.error,
        details: {
          item_id: itemId,
          owner_monday: ownership.ownerMonday,
          owner_session: session.monday_status_value,
          owner_session_nombre: session.nombre,
          monday_reason: ownership.reason,
        },
      };
      await markIdempotencyFailed(requestId, "transfer_repair", failJson);
      const res = NextResponse.json(failJson, { status: ownership.httpStatus });
      return addCorsHeaders(res, req);
    }

    // Build clean FormData - DON'T trust client's tecnico fields
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
    forward.set("tecnico_nombre", session.nombre);

    const n8nRes = await fetch(`${n8nBase}/tech-transferir-reparacion`, {
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
      await markIdempotencySuccess(requestId, "transfer_repair", json);
      // Invalidate reparaciones cache
      cache.invalidatePattern("reparaciones:");
      // Drop the transferred item from the live snapshot so a racing refresh
      // (Monday not yet propagated) can't leave a stale row behind.
      try {
        await deleteLiveRepair(itemId);
      } catch (e) {
        console.error("deleteLiveRepair after transferir-reparacion:", e);
      }
    } else {
      // n8n no completó (webhook caído, error de Monday dentro del flujo, etc.).
      // Aseguramos un código + mensaje claros para que la app no muestre un error
      // vacío y confuso.
      if (!json.code) json.code = "N8N_ERROR";
      if (!json.error) {
        json.error =
          n8nRes.status === 404
            ? "El flujo de automatización (n8n) no está activo. Avisa al admin."
            : "El servicio de automatización (n8n) no pudo completar la transferencia. Intenta de nuevo.";
      }
      await markIdempotencyFailed(requestId, "transfer_repair", json);
    }

    const res = NextResponse.json(json, {
      status: n8nRes.ok ? n8nRes.status : n8nRes.status || 502,
    });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("tech-transferir-reparacion error:", error);
    // Liberar la idempotency key: un fallo transitorio no debe dejar el item
    // trabado en 409 "Request already processing" en los reintentos.
    await markIdempotencyFailed(requestId, "transfer_repair", {
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

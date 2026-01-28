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
    const body = await req.json().catch(() => ({}));
    const itemId = String(body?.item_id ?? "").trim();
    const requestId = String(body?.request_id ?? "").trim();

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

    // Ownership check in Monday (repairs board)
    const monday = await getOwnerTextForItem(itemId, OWNER_COLUMNS.REPAIRS);
    const currentOwner = (monday.ownerText ?? "").trim();

    if (currentOwner !== session.monday_status_value) {
      const res = NextResponse.json(
        {
          success: false,
          code: "NOT_OWNER",
          error: "No eres el dueño de esta reparación",
          details: {
            item_id: itemId,
            owner_actual: currentOwner,
            owner_session: session.monday_status_value,
          },
        },
        { status: 403 }
      );
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
    } else {
      await markIdempotencyFailed(requestId, "repair_status", json);
    }

    const res = NextResponse.json(json, { status: n8nRes.status });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("tech-cambiar-estado error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

// POST /api/n8n/tech-transferir-reparacion
// Transfers a repair to another technician
// Validates: session + CSRF + ownership in Monday (repairs board)

import { NextRequest, NextResponse } from "next/server";
import { getOwnerTextForItem, OWNER_COLUMNS } from "@/lib/monday";
import { validateSession, validateCsrf, csrfError } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

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

    if (!itemId) {
      const res = NextResponse.json(
        { success: false, code: "BAD_REQUEST", error: "item_id requerido" },
        { status: 400 }
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

    const res = NextResponse.json(json, { status: n8nRes.status });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("tech-transferir-reparacion error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

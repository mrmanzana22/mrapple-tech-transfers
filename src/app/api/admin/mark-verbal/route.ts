// POST /api/admin/mark-verbal
// Jefe marca aprobación verbal/telefónica (sin token del cliente)
// Requiere sesión de jefe

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { validateSession, validateCsrf, csrfError } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  // CSRF check
  if (!validateCsrf(req)) {
    return csrfError();
  }

  // Session check - must be jefe
  const session = await validateSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  if (session.rol !== "jefe") {
    return NextResponse.json(
      { success: false, error: "Solo el jefe puede marcar aprobaciones verbales" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { itemId, decision, via } = body;

    if (!itemId || !decision) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros (itemId, decision)" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "Decisión inválida" },
        { status: 400 }
      );
    }

    const channel = via === "phone" ? "phone" : "verbal";

    const supabase = getSupabaseServer();

    // For verbal/phone, we update directly without token validation
    // But we still need the record to exist
    const { data: approval, error: fetchError } = await supabase
      .from("mrapple_repair_approvals")
      .select("*")
      .eq("item_id", itemId)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { success: false, error: "Reparación no encontrada" },
        { status: 404 }
      );
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Ya fue procesada", status: approval.status },
        { status: 409 }
      );
    }

    // Update directly
    const { error: updateError } = await supabase
      .from("mrapple_repair_approvals")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_via: channel,
      })
      .eq("item_id", itemId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Error al actualizar" },
        { status: 500 }
      );
    }

    // Log the event
    await supabase.rpc("mrapple_log_repair_event", {
      p_item_id: itemId,
      p_type: decision === "approved" ? "APPROVED" : "REJECTED",
      p_payload: { via: channel, marked_by: session.nombre },
    });

    return NextResponse.json({
      success: true,
      data: {
        itemId,
        status: decision,
        decidedVia: channel,
        markedBy: session.nombre,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/mark-verbal error:", error);
    return NextResponse.json(
      { success: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}

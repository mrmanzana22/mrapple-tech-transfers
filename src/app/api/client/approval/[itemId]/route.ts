// POST /api/client/approval/[itemId]
// Cliente aprueba o rechaza reparación
// Body: { decision: "approved" | "rejected", token: "..." }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await req.json().catch(() => ({}));
    const { decision, token } = body;

    // Validate input
    if (!itemId || !token) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "Decisión inválida" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Call the RPC to decide
    const { data, error } = await supabase.rpc("mrapple_decide_repair_approval", {
      p_item_id: itemId,
      p_token: token,
      p_decision: decision,
      p_via: "web",
    });

    if (error) {
      console.error("RPC error:", error);
      return NextResponse.json(
        { success: false, error: "Error al procesar" },
        { status: 500 }
      );
    }

    // RPC returns empty if token invalid/expired/already decided
    if (!data || data.length === 0) {
      // Check why it failed
      const { data: approval } = await supabase
        .from("mrapple_repair_approvals")
        .select("status, token_expires_at")
        .eq("item_id", itemId)
        .single();

      if (!approval) {
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

      if (new Date(approval.token_expires_at) < new Date()) {
        return NextResponse.json(
          { success: false, error: "Link expirado", expired: true },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 403 }
      );
    }

    // Success - trigger n8n webhook to update Monday and notify
    const result = data[0];

    // Get repair details for notification
    const { data: repairDetails } = await supabase
      .from("mrapple_repair_approvals")
      .select("cliente_nombre, tipo_reparacion, valor_a_cobrar")
      .eq("item_id", itemId)
      .single();

    // Fire and forget - don't wait for n8n response
    fetch("https://appn8n-n8n.lx6zon.easypanel.host/webhook/repair-approval-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        decision: decision,
        cliente_nombre: repairDetails?.cliente_nombre || "Cliente",
        tipo_reparacion: repairDetails?.tipo_reparacion || "Reparación",
        valor: repairDetails?.valor_a_cobrar || 0,
      }),
    }).catch((err) => console.error("n8n webhook error:", err));

    return NextResponse.json({
      success: true,
      data: {
        itemId: result.item_id,
        status: result.status,
        decidedAt: result.decided_at,
      },
    });
  } catch (error) {
    console.error("POST /api/client/approval error:", error);
    return NextResponse.json(
      { success: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}

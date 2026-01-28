// GET /api/client/repair/[itemId]?t=TOKEN
// Returns repair info for public client page
// Uses RPC for token validation

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const token = req.nextUrl.searchParams.get("t");

    if (!itemId || !token) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Call the RPC to get public info (validates token internally)
    const { data, error } = await supabase.rpc("mrapple_get_repair_approval_public", {
      p_item_id: itemId,
      p_token: token,
    });

    if (error) {
      console.error("RPC error:", error);
      return NextResponse.json(
        { success: false, error: "Error al consultar" },
        { status: 500 }
      );
    }

    // RPC returns empty if token invalid/expired
    if (!data || data.length === 0) {
      // Check if it exists but token is wrong/expired
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

    const repair = data[0];

    return NextResponse.json({
      success: true,
      data: {
        itemId: repair.item_id,
        status: repair.status,
        clienteNombre: repair.cliente_nombre,
        tipoReparacion: repair.tipo_reparacion,
        serialImei: repair.serial_imei,
        valorACobrar: repair.valor_a_cobrar,
        reparadoA: repair.reparado_a,
        tokenExpiresAt: repair.token_expires_at,
      },
    });
  } catch (error) {
    console.error("GET /api/client/repair error:", error);
    return NextResponse.json(
      { success: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}

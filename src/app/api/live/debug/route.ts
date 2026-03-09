import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isLiveSnapshotEnabled } from "@/lib/live-snapshot";

export async function GET(request: NextRequest) {
  const session = await validateSession(request);
  if (!session || session.rol !== "jefe") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tecnico = request.nextUrl.searchParams.get("tecnico") || "IDEL";
  const supabase = getSupabaseServer();

  const [phones, repairs, summary] = await Promise.all([
    supabase
      .from("mrapple_live_phones")
      .select("item_id, tecnico_nombre, updated_at")
      .eq("tecnico_nombre", tecnico),
    supabase
      .from("mrapple_live_repairs")
      .select("item_id, tecnico_nombre, updated_at")
      .eq("tecnico_nombre", tecnico),
    supabase
      .from("mrapple_live_team_summary")
      .select("*")
      .eq("tecnico_nombre", tecnico),
  ]);

  // Also get ALL distinct tecnico_nombre values to check for mismatches
  const allPhoneTecnicos = await supabase
    .from("mrapple_live_phones")
    .select("tecnico_nombre")
    .limit(50);

  return NextResponse.json({
    snapshotEnabled: isLiveSnapshotEnabled(),
    envSet: !!process.env.USE_LIVE_SNAPSHOT,
    tecnicoQueried: tecnico,
    phones: {
      count: phones.data?.length ?? 0,
      error: phones.error?.message,
      rows: phones.data,
    },
    repairs: {
      count: repairs.data?.length ?? 0,
      error: repairs.error?.message,
      rows: repairs.data,
    },
    summary: {
      data: summary.data,
      error: summary.error?.message,
    },
    allPhoneTecnicos: [...new Set(allPhoneTecnicos.data?.map(r => r.tecnico_nombre) || [])],
  });
}

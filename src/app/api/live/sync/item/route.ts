import { NextRequest, NextResponse } from "next/server";
import { refreshTeamSummary, upsertLivePhones, upsertLiveRepairs } from "@/lib/live-snapshot";
import type { Phone, ReparacionCliente } from "@/types";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.LIVE_SYNC_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization") || "";
  const token = request.headers.get("x-live-sync-secret") || "";
  return auth === `Bearer ${secret}` || token === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body?.type || "");
    const sourceTs = typeof body?.sourceTs === "string" ? body.sourceTs : new Date().toISOString();

    if (type === "phone") {
      const payload = body?.payload as Phone | undefined;
      if (!payload?.id) {
        return NextResponse.json({ success: false, error: "Invalid phone payload" }, { status: 400 });
      }
      await upsertLivePhones([payload], sourceTs);
      await refreshTeamSummary(sourceTs);
      return NextResponse.json({ success: true, type });
    }

    if (type === "repair") {
      const payload = body?.payload as ReparacionCliente | undefined;
      if (!payload?.id) {
        return NextResponse.json({ success: false, error: "Invalid repair payload" }, { status: 400 });
      }
      await upsertLiveRepairs([payload], sourceTs);
      await refreshTeamSummary(sourceTs);
      return NextResponse.json({ success: true, type });
    }

    return NextResponse.json(
      { success: false, error: "type must be 'phone' or 'repair'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/live/sync/item error:", error);
    return NextResponse.json(
      { success: false, error: "Live item sync failed" },
      { status: 500 }
    );
  }
}


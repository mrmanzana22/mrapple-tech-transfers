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
    const phones = Array.isArray(body?.phones) ? (body.phones as Phone[]) : [];
    const repairs = Array.isArray(body?.repairs) ? (body.repairs as ReparacionCliente[]) : [];
    const sourceTs = typeof body?.sourceTs === "string" ? body.sourceTs : new Date().toISOString();

    await Promise.all([
      upsertLivePhones(phones, sourceTs),
      upsertLiveRepairs(repairs, sourceTs),
    ]);
    await refreshTeamSummary(sourceTs);

    return NextResponse.json({
      success: true,
      upserted: {
        phones: phones.length,
        repairs: repairs.length,
      },
      sourceTs,
    });
  } catch (error) {
    console.error("POST /api/live/sync/full error:", error);
    return NextResponse.json(
      { success: false, error: "Live sync failed" },
      { status: 500 }
    );
  }
}


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

    // Alerta de truncamiento: el sync de n8n lee cada grupo de Monday con
    // items_page(limit: 500) SIN cursor. Si un grupo llega a 500 items, los
    // que sobran se pierden silenciosamente del snapshot. n8n nos manda en
    // `meta.truncatedGroups` los grupos que tocaron el tope para enterarnos
    // ANTES de que sea un bug de conteo. Hoy ningún grupo pasa de ~450.
    const truncatedGroups: string[] = Array.isArray(body?.meta?.truncatedGroups)
      ? body.meta.truncatedGroups.map(String)
      : [];
    if (truncatedGroups.length > 0) {
      console.error(
        `[SYNC TRUNCATION] ${truncatedGroups.length} grupo(s) de Monday tocaron el límite de 500 items y fueron truncados: ${truncatedGroups.join(", ")}. Hace falta paginación con cursor en el workflow n8n aXkIXqlKjgt6cjUm.`
      );
    }

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
      truncatedGroups,
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


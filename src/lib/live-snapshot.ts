import { getSupabaseServer } from "@/lib/supabase-server";
import type { Phone, ReparacionCliente } from "@/types";

type TeamSummaryRow = {
  tecnico_nombre: string;
  phones_count: number;
  repairs_count: number;
  updated_at: string;
};

const LIVE_SCHEMA_HINT = "mrapple_live_";
const LIVE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes - data older than this is considered stale

export function isLiveSnapshotEnabled(): boolean {
  return process.env.USE_LIVE_SNAPSHOT !== "false";
}

function isMissingLiveSchemaError(error: unknown): boolean {
  const msg = String(error || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("not found") || msg.includes(LIVE_SCHEMA_HINT);
}

export interface LiveReadResult<T> {
  data: T[];
  isStale: boolean;
}

// Helper: check if a technician exists in team_summary (means they were synced)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readTecnicoSummary(supabase: any, tecnicoNombre: string): Promise<TeamSummaryRow | null> {
  try {
    const { data, error } = await supabase
      .from("mrapple_live_team_summary")
      .select("tecnico_nombre, phones_count, repairs_count, updated_at")
      .eq("tecnico_nombre", tecnicoNombre)
      .single();
    if (error || !data) return null;
    return data as TeamSummaryRow;
  } catch {
    return null;
  }
}

export async function readLivePhonesByTecnico(tecnicoNombre: string): Promise<LiveReadResult<Phone> | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("mrapple_live_phones")
      .select("payload, updated_at")
      .eq("tecnico_nombre", tecnicoNombre)
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingLiveSchemaError(error.message)) return null;
      throw error;
    }

    if (data && data.length > 0) {
      const newestAt = new Date(data[0].updated_at).getTime();
      const isStale = Date.now() - newestAt > LIVE_MAX_AGE_MS;
      return { data: data.map((row) => row.payload as Phone), isStale };
    }

    // No phone rows — check team_summary to know if this tech was synced with 0 phones
    const summary = await readTecnicoSummary(supabase, tecnicoNombre);
    if (summary) {
      const isStale = Date.now() - new Date(summary.updated_at).getTime() > LIVE_MAX_AGE_MS;
      return { data: [], isStale };
    }

    return null;
  } catch (error) {
    if (isMissingLiveSchemaError(error)) return null;
    throw error;
  }
}

export async function readLiveRepairsByTecnico(tecnicoNombre: string): Promise<LiveReadResult<ReparacionCliente> | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("mrapple_live_repairs")
      .select("payload, updated_at")
      .eq("tecnico_nombre", tecnicoNombre)
      .order("updated_at", { ascending: false });

    if (error) {
      if (isMissingLiveSchemaError(error.message)) return null;
      throw error;
    }

    if (data && data.length > 0) {
      const newestAt = new Date(data[0].updated_at).getTime();
      const isStale = Date.now() - newestAt > LIVE_MAX_AGE_MS;
      return { data: data.map((row) => row.payload as ReparacionCliente), isStale };
    }

    // No repair rows — check team_summary to know if this tech was synced with 0 repairs
    const summary = await readTecnicoSummary(supabase, tecnicoNombre);
    if (summary) {
      const isStale = Date.now() - new Date(summary.updated_at).getTime() > LIVE_MAX_AGE_MS;
      return { data: [], isStale };
    }

    return null;
  } catch (error) {
    if (isMissingLiveSchemaError(error)) return null;
    throw error;
  }
}

export async function upsertLivePhones(
  phones: Phone[],
  sourceTs?: string,
  options?: { cleanupTecnico?: string }
): Promise<void> {
  const supabase = getSupabaseServer();
  const nowIso = new Date().toISOString();

  // Si conocemos al técnico, borra sus filas viejas que ya no están en la data
  // fresca de Monday. Mismo patrón que upsertLiveRepairs. Este es el fix del
  // drift que infló a DANIELA a 111 filas fantasma: el upsert por item_id nunca
  // borraba los equipos que dejaron de ser de ella (Tecnico vacío en Monday),
  // así que se acumulaban indefinidamente.
  const cleanupTecnico = options?.cleanupTecnico;
  if (cleanupTecnico) {
    const freshItemIds = phones
      .filter((p) => String(p.tecnico || "").trim() === cleanupTecnico)
      .map((p) => String(p.id));
    try {
      let query = supabase
        .from("mrapple_live_phones")
        .delete()
        .eq("tecnico_nombre", cleanupTecnico);
      if (freshItemIds.length > 0) {
        query = query.not("item_id", "in", `(${freshItemIds.join(",")})`);
      }
      await query;
    } catch (error) {
      if (!isMissingLiveSchemaError(error)) {
        console.error("live phones cleanup error:", error);
      }
    }
  }

  if (!phones.length) return;

  const rows = phones.map((phone) => ({
    item_id: String(phone.id),
    tecnico_nombre: String(phone.tecnico || "").trim(),
    payload: phone,
    source_ts: sourceTs || nowIso,
    updated_at: nowIso,
  }));

  const { error } = await supabase
    .from("mrapple_live_phones")
    .upsert(rows, { onConflict: "item_id" });

  if (error && !isMissingLiveSchemaError(error.message)) {
    throw error;
  }
}

// Remove a single repair from the snapshot by item_id.
// Used right after a mutation succeeds, so a racing n8n refresh (triggered
// while Monday hasn't propagated yet) can't re-insert the stale row.
export async function deleteLiveRepair(itemId: string): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("mrapple_live_repairs")
      .delete()
      .eq("item_id", String(itemId));
    if (error && !isMissingLiveSchemaError(error.message)) {
      throw error;
    }
  } catch (error) {
    if (isMissingLiveSchemaError(error)) return;
    throw error;
  }
}

export async function upsertLiveRepairs(
  repairs: ReparacionCliente[],
  sourceTs?: string,
  options?: { cleanupTecnico?: string }
): Promise<void> {
  const supabase = getSupabaseServer();
  const nowIso = new Date().toISOString();

  // If we know the technician, remove their stale entries that are no longer in the fresh data
  const cleanupTecnico = options?.cleanupTecnico;
  if (cleanupTecnico) {
    const freshItemIds = repairs.map((r) => String(r.id));
    try {
      let query = supabase
        .from("mrapple_live_repairs")
        .delete()
        .eq("tecnico_nombre", cleanupTecnico);
      if (freshItemIds.length > 0) {
        query = query.not("item_id", "in", `(${freshItemIds.join(",")})`);
      }
      await query;
    } catch (error) {
      if (!isMissingLiveSchemaError(error)) {
        console.error("live repairs cleanup error:", error);
      }
    }
  }

  if (!repairs.length) return;

  const rows = repairs.map((repair) => ({
    item_id: String(repair.id),
    tecnico_nombre: String(repair.asignado_a || "").trim(),
    estado: String(repair.estado || "").trim(),
    payload: repair,
    source_ts: sourceTs || nowIso,
    updated_at: nowIso,
  }));

  const { error } = await supabase
    .from("mrapple_live_repairs")
    .upsert(rows, { onConflict: "item_id" });

  if (error && !isMissingLiveSchemaError(error.message)) {
    throw error;
  }
}

// PostgREST caps a SELECT at 1000 rows by default. mrapple_live_phones tiene
// ~3375 filas, así que un select directo solo veía el primer tercio y los
// técnicos que quedaban fuera de esa ventana se contaban como 0. Esta helper
// pagina con .range() hasta agotar la tabla, garantizando un conteo completo.
const PAGE_SIZE = 1000;

async function selectAllRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  column: string
): Promise<Array<Record<string, unknown>>> {
  const all: Array<Record<string, unknown>> = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (isMissingLiveSchemaError(error.message)) return all;
      throw error;
    }

    const batch = data || [];
    all.push(...batch);

    if (batch.length < PAGE_SIZE) break; // última página
    from += PAGE_SIZE;
  }

  return all;
}

export async function refreshTeamSummary(sourceTs?: string): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    const nowIso = new Date().toISOString();

    const [{ data: tecnicos }, phones, repairs] = await Promise.all([
      supabase
        .from("mrapple_tecnicos")
        .select("nombre")
        .eq("activo", true)
        .eq("rol", "tecnico"),
      selectAllRows(supabase, "mrapple_live_phones", "tecnico_nombre"),
      selectAllRows(supabase, "mrapple_live_repairs", "tecnico_nombre"),
    ]);

    const phoneCounts = new Map<string, number>();
    const repairCounts = new Map<string, number>();

    for (const p of phones || []) {
      const key = String(p.tecnico_nombre || "").trim();
      if (!key) continue;
      phoneCounts.set(key, (phoneCounts.get(key) || 0) + 1);
    }

    for (const r of repairs || []) {
      const key = String(r.tecnico_nombre || "").trim();
      if (!key) continue;
      repairCounts.set(key, (repairCounts.get(key) || 0) + 1);
    }

    const rows = (tecnicos || []).map((t) => {
      const name = String(t.nombre || "").trim();
      return {
        tecnico_nombre: name,
        phones_count: phoneCounts.get(name) || 0,
        repairs_count: repairCounts.get(name) || 0,
        source_ts: sourceTs || nowIso,
        updated_at: nowIso,
      };
    });

    if (!rows.length) return;
    const { error } = await supabase
      .from("mrapple_live_team_summary")
      .upsert(rows, { onConflict: "tecnico_nombre" });
    if (error && !isMissingLiveSchemaError(error.message)) {
      throw error;
    }
  } catch (error) {
    if (isMissingLiveSchemaError(error)) return;
    throw error;
  }
}

export async function readTeamSummary(): Promise<TeamSummaryRow[] | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("mrapple_live_team_summary")
      .select("tecnico_nombre, phones_count, repairs_count, updated_at")
      .order("tecnico_nombre", { ascending: true });

    if (error) {
      if (isMissingLiveSchemaError(error.message)) return null;
      throw error;
    }

    return (data || []) as TeamSummaryRow[];
  } catch (error) {
    if (isMissingLiveSchemaError(error)) return null;
    throw error;
  }
}


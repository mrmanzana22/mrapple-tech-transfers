// GET /api/live/historial?filtro=enviados|recibidos|todos&limit=80
// Historial de movimientos del técnico logueado (envíos + recibidos).
// Lee mrapple_transfer_logs, que YA contiene transferencias de teléfonos
// (workflow tech-transferir) y de reparaciones (workflow tech-transferir-reparacion):
// ambos workflows escriben en esa tabla vía su nodo "Supabase Log".
//
// Notas de datos:
//  - tecnico_origen se guarda como el UUID del técnico de la sesión.
//  - tecnico_destino se guarda como el NOMBRE del técnico que recibe.
//  - el tipo (teléfono vs reparación) no está en el log; lo derivamos buscando
//    el item_id en el snapshot (mrapple_live_phones / mrapple_live_repairs).

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

type LogRow = {
  id: string;
  item_id: string;
  item_nombre: string | null;
  tipo: string | null;
  imei: string | null;
  tecnico_origen: string | null;
  tecnico_destino: string | null;
  comentario: string | null;
  tiene_foto: boolean | null;
  foto_url: string | null;
  created_at: string;
};

export interface MovimientoHistorial {
  id: string;
  item_id: string;
  equipo: string;
  imei: string | null;
  specs: string | null;
  tipo: "telefono" | "reparacion" | "desconocido";
  de: string;
  para: string;
  direccion: "enviado" | "recibido";
  comentario: string | null;
  tiene_foto: boolean;
  foto_url: string | null;
  fecha: string;
}

// Specs legibles a partir del payload del snapshot.
function buildSpecs(tipo: "telefono" | "reparacion", p: Record<string, unknown>): string | null {
  const str = (v: unknown) => (v == null ? "" : String(v).trim());
  if (tipo === "telefono") {
    const parts = [
      str(p.gb) && `${str(p.gb)}GB`,
      str(p.color),
      str(p.grado) && `Grado ${str(p.grado)}`,
      str(p.estado_bateria) && `${str(p.estado_bateria)}%`,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  const parts = [str(p.tipo_reparacion), str(p.cliente_nombre), str(p.estado)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export async function GET(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) {
    const res = NextResponse.json(
      { success: false, code: "NO_SESSION", error: "No autenticado" },
      { status: 401 }
    );
    return addCorsHeaders(res, req);
  }

  const filtroParam = (req.nextUrl.searchParams.get("filtro") || "todos").toLowerCase();
  const filtro = ["enviados", "recibidos", "todos"].includes(filtroParam)
    ? (filtroParam as "enviados" | "recibidos" | "todos")
    : "todos";

  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "80", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 80;

  // Búsqueda por IMEI o modelo. Sanitizamos a alfanumérico + espacio para
  // evitar romper el patrón ilike / inyección de wildcards.
  const rawQ = (req.nextUrl.searchParams.get("q") || "").trim();
  // Neutralizamos wildcards de ilike (% _ *) y separadores de PostgREST.
  const q = rawQ.replace(/[%_*,()\\]/g, " ").replace(/\s+/g, " ").trim();

  try {
    const supabase = getSupabaseServer();
    const myId = session.tecnico_id;
    const myName = session.nombre;

    // Si hay búsqueda, resolvemos qué item_ids coinciden por IMEI o nombre
    // en el snapshot (cubre TODO el historial, no solo lo cargado).
    let searchItemIds: string[] | null = null;
    if (q.length >= 2) {
      const pattern = `%${q}%`;
      const [pImei, pNombre, rImei, rNombre] = await Promise.all([
        supabase.from("mrapple_live_phones").select("item_id").ilike("payload->>imei", pattern),
        supabase.from("mrapple_live_phones").select("item_id").ilike("payload->>nombre", pattern),
        supabase.from("mrapple_live_repairs").select("item_id").ilike("payload->>imei", pattern),
        supabase.from("mrapple_live_repairs").select("item_id").ilike("payload->>nombre", pattern),
      ]);
      const ids = new Set<string>();
      for (const res of [pImei, pNombre, rImei, rNombre]) {
        for (const row of (res.data || []) as { item_id: string }[]) {
          if (row.item_id) ids.add(row.item_id);
        }
      }
      searchItemIds = Array.from(ids);
    }

    // PostgREST no normaliza acentos; los nombres internos no llevan tildes.
    // Para "recibidos" comparamos el destino (nombre) sin distinguir mayúsculas.
    let query = supabase
      .from("mrapple_transfer_logs")
      .select(
        "id, item_id, item_nombre, tipo, imei, tecnico_origen, tecnico_destino, comentario, tiene_foto, foto_url, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filtro === "enviados") {
      query = query.eq("tecnico_origen", myId);
    } else if (filtro === "recibidos") {
      query = query.ilike("tecnico_destino", myName);
    } else {
      // todos: origen = mi id  O  destino = mi nombre
      query = query.or(`tecnico_origen.eq.${myId},tecnico_destino.ilike.${myName}`);
    }

    // Búsqueda: restringe a los item_ids que coinciden (AND con el scope).
    if (searchItemIds !== null) {
      query = query.in("item_id", searchItemIds.length ? searchItemIds : ["__none__"]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("historial query error:", error);
      const res = NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Error al leer historial" },
        { status: 500 }
      );
      return addCorsHeaders(res, req);
    }

    const rows = (data || []) as LogRow[];

    // Resolver UUIDs de origen -> nombre, y clasificar/enriquecer el equipo.
    const originIds = Array.from(
      new Set(rows.map((r) => r.tecnico_origen).filter((v): v is string => !!v && v.includes("-")))
    );
    const itemIds = Array.from(new Set(rows.map((r) => r.item_id).filter(Boolean)));

    const [tecnicosRes, phonesRes, repairsRes] = await Promise.all([
      originIds.length
        ? supabase.from("mrapple_tecnicos").select("id, nombre").in("id", originIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
      itemIds.length
        ? supabase.from("mrapple_live_phones").select("item_id, payload").in("item_id", itemIds)
        : Promise.resolve({ data: [] as { item_id: string; payload: Record<string, unknown> }[] }),
      itemIds.length
        ? supabase.from("mrapple_live_repairs").select("item_id, payload").in("item_id", itemIds)
        : Promise.resolve({ data: [] as { item_id: string; payload: Record<string, unknown> }[] }),
    ]);

    const idToName = new Map<string, string>();
    for (const t of (tecnicosRes.data || []) as { id: string; nombre: string }[]) {
      idToName.set(t.id, t.nombre);
    }
    const phoneItems = new Map<string, Record<string, unknown>>();
    for (const p of (phonesRes.data || []) as { item_id: string; payload: Record<string, unknown> }[]) {
      phoneItems.set(p.item_id, p.payload);
    }
    const repairItems = new Map<string, Record<string, unknown>>();
    for (const r of (repairsRes.data || []) as { item_id: string; payload: Record<string, unknown> }[]) {
      repairItems.set(r.item_id, r.payload);
    }

    const resolveOrigen = (v: string | null): string => {
      if (!v) return "Desconocido";
      // Si es UUID, mapeamos a nombre; si ya es nombre, lo dejamos.
      return v.includes("-") ? idToName.get(v) || "Desconocido" : v;
    };

    const movimientos: MovimientoHistorial[] = rows.map((r) => {
      const phone = phoneItems.get(r.item_id);
      const repair = repairItems.get(r.item_id);
      // Fallbacks del log (se guardan al transferir): blindan el historial
      // cuando el item ya no está en el snapshot tras moverse.
      let tipo: MovimientoHistorial["tipo"] =
        r.tipo === "telefono" || r.tipo === "reparacion" ? r.tipo : "desconocido";
      let equipo = r.item_nombre || "";
      let imei: string | null = r.imei || null;
      let specs: string | null = null;
      if (phone) {
        tipo = "telefono";
        equipo = String(phone.nombre || r.item_nombre || `Equipo ${r.item_id}`);
        imei = phone.imei ? String(phone.imei) : imei;
        specs = buildSpecs("telefono", phone);
      } else if (repair) {
        tipo = "reparacion";
        equipo = String(repair.nombre || r.item_nombre || `Reparación ${r.item_id}`);
        imei = repair.imei ? String(repair.imei) : imei;
        specs = buildSpecs("reparacion", repair);
      } else if (!equipo) {
        equipo = `Item ${r.item_id}`;
      }

      const direccion: MovimientoHistorial["direccion"] =
        r.tecnico_origen === myId ? "enviado" : "recibido";

      return {
        id: r.id,
        item_id: r.item_id,
        equipo,
        imei,
        specs,
        tipo,
        de: resolveOrigen(r.tecnico_origen),
        para: r.tecnico_destino || "—",
        direccion,
        comentario: r.comentario,
        tiene_foto: !!r.tiene_foto,
        foto_url: r.foto_url,
        fecha: r.created_at,
      };
    });

    const res = NextResponse.json({ success: true, data: movimientos, filtro });
    return addCorsHeaders(res, req);
  } catch (error) {
    console.error("historial error:", error);
    const res = NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error de servidor" },
      { status: 500 }
    );
    return addCorsHeaders(res, req);
  }
}

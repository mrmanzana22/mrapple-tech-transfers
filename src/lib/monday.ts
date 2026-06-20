// Monday.com GraphQL helper for ownership validation
// Used by Phase 2 API routes to verify item ownership before operations

export type MondayOwnerResult = {
  itemId: string;
  itemName: string;
  ownerText: string | null;
  groupTitle: string | null;
  /** false cuando Monday no devolvió el item (movido/eliminado). */
  found: boolean;
};

export type MondayErrorKind =
  | "auth"
  | "rate_limit"
  | "not_found"
  | "network"
  | "unknown";

/**
 * Error clasificado de Monday. `reason` es texto en español apto para mostrar
 * al usuario (ej. "token inválido o sin permisos"), para que la app explique
 * con claridad que el fallo viene de Monday y por qué.
 */
export class MondayError extends Error {
  kind: MondayErrorKind;
  reason: string;
  constructor(kind: MondayErrorKind, reason: string, raw?: unknown) {
    super(`Monday ${kind}: ${reason}${raw ? ` — ${JSON.stringify(raw)}` : ""}`);
    this.name = "MondayError";
    this.kind = kind;
    this.reason = reason;
  }
}

function classifyMonday(status: number, json: unknown): { kind: MondayErrorKind; reason: string } {
  const raw = JSON.stringify(json ?? {}).toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    raw.includes("not authenticated") ||
    raw.includes("authentication") ||
    raw.includes("unauthorized")
  ) {
    return { kind: "auth", reason: "token de Monday inválido o sin permisos" };
  }
  if (
    status === 429 ||
    raw.includes("complexity") ||
    raw.includes("rate limit") ||
    raw.includes("minute limit") ||
    raw.includes("budget exhausted")
  ) {
    return { kind: "rate_limit", reason: "Monday está saturado (límite de peticiones)" };
  }
  if (raw.includes("does not exist") || raw.includes("not found")) {
    return { kind: "not_found", reason: "el dato no existe en Monday" };
  }
  return { kind: "unknown", reason: `respuesta inesperada de Monday (HTTP ${status})` };
}

const MONDAY_API_URL = "https://api.monday.com/v2";

async function mondayGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new MondayError("auth", "falta el token de Monday (MONDAY_API_TOKEN)");

  let res: Response;
  try {
    res = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (e) {
    throw new MondayError("network", "no se pudo contactar a Monday", String(e));
  }

  let json: { data?: T; errors?: unknown[] } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const c = classifyMonday(res.status, json);
    throw new MondayError(c.kind, c.reason, json);
  }

  if (json?.errors?.length) {
    const c = classifyMonday(res.status, json);
    throw new MondayError(c.kind, c.reason, json.errors);
  }

  return json?.data as T;
}

/**
 * Reads the owner (label .text) from a Monday status column for an item_id.
 * Uses items(ids:[...]) to not depend on the board.
 */
export async function getOwnerTextForItem(
  itemId: string,
  ownerColumnId: string
): Promise<MondayOwnerResult> {
  const query = `
    query ($ids: [ID!], $colIds: [String!]) {
      items(ids: $ids) {
        id
        name
        column_values(ids: $colIds) {
          id
          text
        }
        group {
          title
        }
      }
    }
  `;

  type Resp = {
    items: Array<{
      id: string;
      name: string;
      column_values: Array<{ id: string; text: string | null }>;
      group: { title: string } | null;
    }>;
  };

  const data = await mondayGraphQL<Resp>(query, {
    ids: [itemId],
    colIds: [ownerColumnId],
  });

  const item = data.items?.[0];
  if (!item) {
    return { itemId, itemName: "", ownerText: null, groupTitle: null, found: false };
  }

  const owner = item.column_values?.find((c) => c.id === ownerColumnId);
  return {
    itemId: item.id,
    itemName: item.name,
    ownerText: owner?.text ?? null,
    groupTitle: item.group?.title ?? null,
    found: true,
  };
}

// Column IDs for ownership validation
export const OWNER_COLUMNS = {
  PHONES: "color_mkzxt1at",      // Board 672309386 - Teléfonos
  REPAIRS: "estado_1",           // Board 324982306 - Reparaciones
} as const;

// Monday.com GraphQL helper for ownership validation
// Used by Phase 2 API routes to verify item ownership before operations

export type MondayOwnerResult = {
  itemId: string;
  itemName: string;
  ownerText: string | null;
};

const MONDAY_API_URL = "https://api.monday.com/v2";

async function mondayGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN missing");

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Monday HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  if (json?.errors?.length) {
    throw new Error(`Monday GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
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
      }
    }
  `;

  type Resp = {
    items: Array<{
      id: string;
      name: string;
      column_values: Array<{ id: string; text: string | null }>;
    }>;
  };

  const data = await mondayGraphQL<Resp>(query, {
    ids: [itemId],
    colIds: [ownerColumnId],
  });

  const item = data.items?.[0];
  if (!item) {
    return { itemId, itemName: "", ownerText: null };
  }

  const owner = item.column_values?.find((c) => c.id === ownerColumnId);
  return {
    itemId: item.id,
    itemName: item.name,
    ownerText: owner?.text ?? null,
  };
}

// Column IDs for ownership validation
export const OWNER_COLUMNS = {
  PHONES: "color_mkzxt1at",      // Board 672309386 - Teléfonos
  REPAIRS: "estado_1",           // Board 324982306 - Reparaciones
} as const;

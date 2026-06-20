// Validación de dueño de una reparación con Monday como ÚNICA fuente de verdad.
//
// Por qué: antes el dueño se decidía con un snapshot de Supabase que se
// desincronizaba de Monday → items fantasma y NOT_OWNER confusos. Ahora se
// pregunta a Monday (columna estado_1) en el momento de la acción. Si Monday
// falla, se devuelve un error EXTERNO claro (ERROR_MONDAY) en vez de un 403
// ambiguo, para que el técnico sepa que el problema es de Monday y por qué.

import { getOwnerTextForItem, OWNER_COLUMNS, MondayError } from "./monday";

export type OwnershipCode =
  | "NOT_OWNER"
  | "SIN_ASIGNAR"
  | "ITEM_NO_EXISTE"
  | "ERROR_MONDAY";

export type OwnershipResult =
  | { ok: true; owner: string }
  | {
      ok: false;
      code: OwnershipCode;
      httpStatus: number;
      error: string;
      reason: string | null;
      ownerMonday: string | null;
    };

// Normaliza un nombre para comparar de forma robusta: sin acentos, sin espacios
// sobrantes, en mayúsculas. Evita falsos NOT_OWNER por "Sebastián" vs "SEBASTIAN".
function normalizeOwner(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Verifica que la reparación `itemId` pertenezca al técnico de la sesión según
 * Monday. Acepta tanto session.nombre como session.monday_status_value.
 */
export async function checkRepairOwnership(
  itemId: string,
  session: { nombre: string; monday_status_value?: string | null }
): Promise<OwnershipResult> {
  const sessionOwners = new Set(
    [session.monday_status_value, session.nombre]
      .map(normalizeOwner)
      .filter((v) => v !== "")
  );

  let info: Awaited<ReturnType<typeof getOwnerTextForItem>>;
  try {
    info = await getOwnerTextForItem(itemId, OWNER_COLUMNS.REPAIRS);
  } catch (e) {
    const reason = e instanceof MondayError ? e.reason : "Monday no respondió";
    return {
      ok: false,
      code: "ERROR_MONDAY",
      httpStatus: 502,
      error: `⚠️ Error de Monday: ${reason}. Intenta de nuevo en un momento.`,
      reason,
      ownerMonday: null,
    };
  }

  if (!info.found) {
    return {
      ok: false,
      code: "ITEM_NO_EXISTE",
      httpStatus: 404,
      error: "Esta reparación ya no existe en Monday (pudo moverse o eliminarse).",
      reason: null,
      ownerMonday: null,
    };
  }

  const owner = (info.ownerText ?? "").trim();
  if (!owner) {
    return {
      ok: false,
      code: "SIN_ASIGNAR",
      httpStatus: 409,
      error: "Esta reparación no tiene técnico asignado en Monday.",
      reason: null,
      ownerMonday: null,
    };
  }

  if (!sessionOwners.has(normalizeOwner(owner))) {
    return {
      ok: false,
      code: "NOT_OWNER",
      httpStatus: 403,
      error: `Esta reparación está asignada a ${owner}, no a ti.`,
      reason: null,
      ownerMonday: owner,
    };
  }

  return { ok: true, owner };
}

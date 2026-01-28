// Idempotency helpers for API routes
// Prevents duplicate processing on double-click, network retries, etc.

import { getSupabaseServer } from "./supabase-server";

export type IdempotencyScope =
  | "transfer_phone"
  | "repair_status"
  | "transfer_repair";

export interface IdempotencyResult {
  alreadyProcessed: boolean;
  status: "processing" | "succeeded" | "failed";
  response: Record<string, unknown> | null;
}

/**
 * Claims an idempotency key. Call at the start of POST handlers.
 * - If new: returns { alreadyProcessed: false } - proceed with operation
 * - If exists + succeeded: returns { alreadyProcessed: true, response } - return cached response
 * - If exists + processing: returns { alreadyProcessed: true, status: 'processing' } - return 409
 */
export async function claimIdempotencyKey(
  key: string,
  scope: IdempotencyScope,
  tecnicoId?: string
): Promise<IdempotencyResult> {
  if (!key) {
    // No key provided - skip idempotency (backwards compatibility)
    return { alreadyProcessed: false, status: "processing", response: null };
  }

  const supabase = getSupabaseServer();

  const { data, error } = await supabase.rpc("mrapple_idem_claim", {
    p_key: key,
    p_scope: scope,
    p_tecnico_id: tecnicoId || null,
    p_request_hash: null,
  });

  if (error) {
    console.error("Idempotency claim error:", error);
    // On error, allow the request to proceed (fail-open)
    return { alreadyProcessed: false, status: "processing", response: null };
  }

  const row = data?.[0];
  if (!row) {
    return { alreadyProcessed: false, status: "processing", response: null };
  }

  // If status is succeeded, this is a duplicate - return cached response
  if (row.status === "succeeded") {
    return {
      alreadyProcessed: true,
      status: "succeeded",
      response: row.response,
    };
  }

  // If status is still processing (from a previous incomplete request)
  // or if we just inserted, check if it's truly new
  if (row.already_exists && row.status === "processing") {
    return {
      alreadyProcessed: true,
      status: "processing",
      response: null,
    };
  }

  // New request - proceed
  return { alreadyProcessed: false, status: "processing", response: null };
}

/**
 * Marks an idempotency key as succeeded with the response to cache.
 */
export async function markIdempotencySuccess(
  key: string,
  scope: IdempotencyScope,
  response: Record<string, unknown>
): Promise<void> {
  if (!key) return;

  const supabase = getSupabaseServer();

  const { error } = await supabase.rpc("mrapple_idem_succeed", {
    p_key: key,
    p_scope: scope,
    p_response: response,
  });

  if (error) {
    console.error("Idempotency succeed error:", error);
  }
}

/**
 * Marks an idempotency key as failed.
 */
export async function markIdempotencyFailed(
  key: string,
  scope: IdempotencyScope,
  error: Record<string, unknown>
): Promise<void> {
  if (!key) return;

  const supabase = getSupabaseServer();

  const { error: rpcError } = await supabase.rpc("mrapple_idem_fail", {
    p_key: key,
    p_scope: scope,
    p_error: error,
  });

  if (rpcError) {
    console.error("Idempotency fail error:", rpcError);
  }
}

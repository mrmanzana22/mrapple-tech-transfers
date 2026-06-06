"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { config } from "@/lib/config";
import type { ReparacionCliente } from "@/types";

interface UseReparacionesOptions {
  tecnicoNombre: string;
  autoFetch?: boolean;
}

// Fetcher for reparaciones - API returns array directly
const reparacionesFetcher = async (url: string): Promise<ReparacionCliente[]> => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "X-Requested-With": "mrapple" },
  });

  if (res.status === 401) {
    throw new Error("Sesión expirada");
  }

  const data = await res.json();

  // API returns array directly or { error: "..." }
  if (Array.isArray(data)) {
    const tecnico = parseTecnicoFromUrl(url);
    const recentIds = new Set(getRecentTransfers(tecnico).map((t) => t.id));
    return data.filter((r: ReparacionCliente) => !recentIds.has(String(r.id)));
  }

  throw new Error(data.error || "Error al obtener reparaciones");
};

// Key for marking that data is dirty (mutation happened, server may have stale snapshot)
const DIRTY_KEY_PREFIX = "reparaciones-dirty-";
const DIRTY_TTL_MS = 60_000; // 60s window

// Ghost filter: hide recently mutated repair IDs (transferred / completed / rejected)
// from the UI so polling can't resurrect them from a stale snapshot.
const RECENT_TRANSFERS_KEY_PREFIX = "reparaciones-recent-transfers-";
const RECENT_TRANSFER_TTL_MS = 120_000;

type RecentTransfer = { id: string; at: number };

function getRecentTransfers(tecnico: string): RecentTransfer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${RECENT_TRANSFERS_KEY_PREFIX}${tecnico}`);
    if (!raw) return [];
    const list: RecentTransfer[] = JSON.parse(raw);
    const now = Date.now();
    return list.filter((t) => now - t.at < RECENT_TRANSFER_TTL_MS);
  } catch {
    return [];
  }
}

function addRecentTransfer(tecnico: string, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentTransfers(tecnico);
    const updated = [...current.filter((t) => t.id !== id), { id, at: Date.now() }];
    localStorage.setItem(`${RECENT_TRANSFERS_KEY_PREFIX}${tecnico}`, JSON.stringify(updated));
  } catch {}
}

// Saca ids del ghost filter (rollback de un ocultamiento optimista que falló).
// Sin esto, el item quedaría oculto hasta que expire el TTL de 120s aunque la
// transferencia haya fallado y el equipo siga asignado al técnico actual.
function removeRecentTransfers(tecnico: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const idSet = new Set(ids.map(String));
    const updated = getRecentTransfers(tecnico).filter((t) => !idSet.has(t.id));
    localStorage.setItem(`${RECENT_TRANSFERS_KEY_PREFIX}${tecnico}`, JSON.stringify(updated));
  } catch {}
}

function parseTecnicoFromUrl(url: string): string {
  const q = url.indexOf("?");
  const params = new URLSearchParams(q >= 0 ? url.slice(q + 1) : "");
  return params.get("tecnico") || "";
}

export function useReparaciones({ tecnicoNombre, autoFetch = true }: UseReparacionesOptions) {
  const shouldFetch = autoFetch && tecnicoNombre;

  // If a recent mutation happened, force server to bypass stale snapshot
  const needsRefresh = (() => {
    if (typeof window === "undefined" || !tecnicoNombre) return false;
    try {
      const dirtyAt = localStorage.getItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`);
      if (dirtyAt && Date.now() - Number(dirtyAt) < DIRTY_TTL_MS) return true;
    } catch {}
    return false;
  })();

  const url = shouldFetch
    ? `/api/live/reparaciones?tecnico=${encodeURIComponent(tecnicoNombre)}${needsRefresh ? "&refresh=1" : ""}`
    : null;

  // Load cached data for instant display
  const getFallbackData = (): ReparacionCliente[] => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`reparaciones-${tecnicoNombre}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const {
    data: reparaciones = [],
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(url, reparacionesFetcher, {
    dedupingInterval: config.intervals.deduping,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: config.intervals.polling,
    refreshWhenHidden: false,
    keepPreviousData: true,          // Show stale data while revalidating
    shouldRetryOnError: false,
    fallbackData: getFallbackData(),
    onSuccess: (data) => {
      // Cache for next instant load
      if (typeof window !== "undefined" && data.length > 0) {
        try {
          localStorage.setItem(`reparaciones-${tecnicoNombre}`, JSON.stringify(data));
        } catch {
          // Ignore localStorage errors
        }
      }
    },
  });

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Helper: sync data to localStorage so next page load has correct fallback
  const syncToLocalStorage = useCallback((data: ReparacionCliente[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`reparaciones-${tecnicoNombre}`, JSON.stringify(data));
    } catch {}
  }, [tecnicoNombre]);

  // Mark data as dirty so next page load uses refresh=1
  const markDirty = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`, String(Date.now()));
    } catch {}
  }, [tecnicoNombre]);

  const clearDirty = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`);
    } catch {}
  }, [tecnicoNombre]);

  // Remove items from both SWR cache and localStorage (for optimistic updates)
  const removeFromCache = useCallback((ids: string[]) => {
    // Register in ghost filter so concurrent/polling fetches can't resurrect these rows
    ids.forEach((id) => addRecentTransfer(tecnicoNombre, String(id)));
    markDirty(); // Next page load will use refresh=1
    mutate(
      (current) => {
        const updated = current?.filter((r) => !ids.includes(r.id)) ?? [];
        syncToLocalStorage(updated);
        return updated;
      },
      { revalidate: false }
    );
  }, [mutate, syncToLocalStorage, markDirty, tecnicoNombre]);

  // Rollback de un ocultamiento optimista: re-mete las reparaciones al cache +
  // localStorage y las saca del ghost filter, para usar cuando la transferencia
  // en background falla y el equipo sigue asignado al técnico actual.
  const restoreToCache = useCallback((items: ReparacionCliente[]) => {
    if (items.length === 0) return;
    removeRecentTransfers(tecnicoNombre, items.map((r) => String(r.id)));
    mutate(
      (current) => {
        const existing = current ?? [];
        const have = new Set(existing.map((r) => r.id));
        const merged = [...existing, ...items.filter((r) => !have.has(r.id))];
        syncToLocalStorage(merged);
        return merged;
      },
      { revalidate: false }
    );
  }, [mutate, syncToLocalStorage, tecnicoNombre]);

  // Force refresh bypasses server cache (for use after mutations)
  // excludeIds: items recently mutated that Monday might not have propagated yet
  const forceRefresh = useCallback(async (excludeIds?: string[]) => {
    // Immediately remove excluded items from localStorage
    if (excludeIds?.length && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`reparaciones-${tecnicoNombre}`);
        if (cached) {
          const parsed: ReparacionCliente[] = JSON.parse(cached);
          syncToLocalStorage(parsed.filter(r => !excludeIds.includes(r.id)));
        }
      } catch {}
    }

    const refreshUrl = `/api/live/reparaciones?tecnico=${encodeURIComponent(tecnicoNombre)}&refresh=1`;
    let data = await reparacionesFetcher(refreshUrl);
    if (excludeIds?.length) {
      data = data.filter(r => !excludeIds.includes(r.id));
    }
    syncToLocalStorage(data);
    clearDirty(); // Server snapshot is now fresh
    await mutate(data, { revalidate: false });
  }, [tecnicoNombre, mutate, syncToLocalStorage, clearDirty]);

  // isSyncing = background update (not initial load)
  const isSyncing = isValidating && !isLoading && reparaciones.length > 0;

  return {
    reparaciones,
    isLoading,
    isSyncing,
    error: error?.message || null,
    refresh,
    forceRefresh,
    removeFromCache,
    restoreToCache,
    mutate,
  };
}

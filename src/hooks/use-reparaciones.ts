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
    return data;
  }

  throw new Error(data.error || "Error al obtener reparaciones");
};

export function useReparaciones({ tecnicoNombre, autoFetch = true }: UseReparacionesOptions) {
  const shouldFetch = autoFetch && tecnicoNombre;
  const url = shouldFetch
    ? `/api/live/reparaciones?tecnico=${encodeURIComponent(tecnicoNombre)}`
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
    revalidateOnFocus: false,        // Don't refetch on tab focus
    revalidateOnReconnect: true,
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

  // Force refresh bypasses server cache (for use after mutations)
  const forceRefresh = useCallback(async () => {
    const refreshUrl = `/api/live/reparaciones?tecnico=${encodeURIComponent(tecnicoNombre)}&refresh=1`;
    const data = await reparacionesFetcher(refreshUrl);
    await mutate(data, { revalidate: false });
  }, [tecnicoNombre, mutate]);

  // isSyncing = background update (not initial load)
  const isSyncing = isValidating && !isLoading && reparaciones.length > 0;

  return {
    reparaciones,
    isLoading,
    isSyncing,
    error: error?.message || null,
    refresh,
    forceRefresh,
    mutate,
  };
}

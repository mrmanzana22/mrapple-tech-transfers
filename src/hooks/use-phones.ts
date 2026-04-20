"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { getPhonesByTecnico, transferPhone } from "@/lib/api";
import { config } from "@/lib/config";
import type { Phone, TransferPayload } from "@/types";

interface UsePhonesOptions {
  tecnicoNombre: string;
  autoFetch?: boolean;
}

// Key for marking that data is dirty (mutation happened, server may have stale snapshot)
const DIRTY_KEY_PREFIX = "phones-dirty-";
const DIRTY_TTL_MS = 60_000; // 60s window

// Fetcher function for SWR
const phonesFetcher = async (tecnicoNombre: string): Promise<Phone[]> => {
  // Check if there was a recent mutation — if so, bypass server snapshot
  let forceRefresh = false;
  if (typeof window !== "undefined") {
    try {
      const dirtyAt = localStorage.getItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`);
      if (dirtyAt && Date.now() - Number(dirtyAt) < DIRTY_TTL_MS) {
        forceRefresh = true;
      }
    } catch {}
  }

  const result = await getPhonesByTecnico(tecnicoNombre, forceRefresh);
  if (result.success && result.data) {
    // Clear dirty flag after successful fresh fetch
    if (forceRefresh && typeof window !== "undefined") {
      try { localStorage.removeItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`); } catch {}
    }
    return result.data;
  }
  throw new Error(result.error || "Error al obtener telefonos");
};

export function usePhones({ tecnicoNombre, autoFetch = true }: UsePhonesOptions) {
  const shouldFetch = autoFetch && tecnicoNombre;

  // Cargar datos previos de localStorage para carga instantánea
  const getFallbackData = (): Phone[] => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(`phones-${tecnicoNombre}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const {
    data: phones = [],
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    shouldFetch ? tecnicoNombre : null,
    phonesFetcher,
    {
      revalidateOnFocus: false,          // Evita recargas costosas al cambiar de tab/ventana
      revalidateOnReconnect: true,
      dedupingInterval: config.intervals.deduping,
      refreshInterval: 0,                // Manual refresh para priorizar velocidad percibida
      refreshWhenHidden: false,
      keepPreviousData: true,
      shouldRetryOnError: false,         // Evita quedarse en loading varios segundos por reintentos
      errorRetryCount: 0,
      errorRetryInterval: config.intervals.errorRetry,
      fallbackData: getFallbackData(),   // Carga instantánea con datos previos
      onSuccess: (data) => {
        // Guardar en localStorage para próxima carga instantánea
        if (typeof window !== 'undefined' && data.length > 0) {
          try {
            localStorage.setItem(`phones-${tecnicoNombre}`, JSON.stringify(data));
          } catch {
            // Ignorar errores de localStorage
          }
        }
      },
    }
  );

  const fetchPhones = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Helper: sync data to localStorage so next page load has correct fallback
  const syncToLocalStorage = useCallback((data: Phone[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`phones-${tecnicoNombre}`, JSON.stringify(data));
    } catch {}
  }, [tecnicoNombre]);

  const transfer = useCallback(
    async (payload: TransferPayload): Promise<void> => {
      // Optimistic update: remove the phone from the list immediately
      const optimisticPhones = phones.filter((p) => p.id !== payload.item_id);

      // Sync localStorage immediately so page navigation shows correct data
      syncToLocalStorage(optimisticPhones);
      // Mark dirty so next page load bypasses stale server snapshot
      if (typeof window !== "undefined") {
        try { localStorage.setItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`, String(Date.now())); } catch {}
      }

      await mutate(
        async () => {
          const result = await transferPhone(payload);
          if (!result.success) {
            // Rollback localStorage on error
            syncToLocalStorage(phones);
            throw new Error(result.error || "Error al transferir");
          }
          return optimisticPhones;
        },
        {
          optimisticData: optimisticPhones,
          rollbackOnError: true,
          revalidate: false, // NO refetch inmediato - el item ya salió visualmente
        }
      );

      // Revalidate with forced refresh, excluding the just-transferred phone
      // (Monday API may not have propagated the change yet)
      const transferredId = payload.item_id;
      setTimeout(() => {
        mutate(async () => {
          const result = await getPhonesByTecnico(tecnicoNombre, true);
          if (result.success && result.data) {
            const filtered = result.data.filter(p => p.id !== transferredId);
            syncToLocalStorage(filtered);
            // Clear dirty flag — server snapshot is now fresh
            if (typeof window !== "undefined") {
              try { localStorage.removeItem(`${DIRTY_KEY_PREFIX}${tecnicoNombre}`); } catch {}
            }
            return filtered;
          }
          return optimisticPhones;
        }, { revalidate: false });
      }, 2000);
    },
    [phones, mutate, tecnicoNombre, syncToLocalStorage]
  );

  // isSyncing = está actualizando en background (no es carga inicial)
  const isSyncing = isValidating && !isLoading && phones.length > 0;
  const showInitialLoading = isLoading && phones.length === 0 && !error;

  return {
    phones,
    isLoading: showInitialLoading,
    isSyncing,          // Nuevo: sincronizando en background
    isTransferring: isValidating,
    error: error?.message || null,
    fetchPhones,
    transfer,
  };
}

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

// Ghost filter: hide recently transferred phone IDs from the UI for a short window
// so polling/revalidation can't resurrect them before Monday/n8n/cache propagate.
const RECENT_TRANSFERS_KEY_PREFIX = "phones-recent-transfers-";
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

// Fetcher function for SWR.
// Siempre lee del snapshot (la mutación del backend lo deja consistente). El
// dirty flag con refresh=1 fue eliminado porque bypaseaba el snapshot recién
// escrito y caía a Monday/n8n, que tienen latencia de propagación → conteo
// stale. El ghost filter actúa como red de seguridad ante posibles polls
// concurrentes que devuelvan data en transición.
const phonesFetcher = async (tecnicoNombre: string): Promise<Phone[]> => {
  const result = await getPhonesByTecnico(tecnicoNombre, false);
  if (result.success && result.data) {
    const recentIds = new Set(getRecentTransfers(tecnicoNombre).map((t) => t.id));
    return result.data.filter((p) => !recentIds.has(String(p.id)));
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
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: config.intervals.deduping,
      refreshInterval: config.intervals.polling,
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
      // Register in ghost filter before any fetch fires, so a concurrent revalidation
      // can't resurrect this phone from a stale server/cache snapshot.
      addRecentTransfer(tecnicoNombre, String(payload.item_id));

      // Optimistic update: remove the phone from the list immediately.
      // IMPORTANTE: derivar SIEMPRE del estado vigente del cache (current), NO de
      // la variable `phones` capturada en el closure. En un batch (transferir 5 de
      // una), `phones` queda congelado en la lista original; si cada iteración
      // filtra sobre esa foto vieja, solo sobrevive la resta del último item y los
      // demás reaparecen → "transfiero 5, baja 1". Usando `current` cada paso resta
      // sobre la lista ya recortada por el paso anterior.
      const removeItem = (list: Phone[]): Phone[] =>
        list.filter((p) => p.id !== payload.item_id);

      await mutate(
        async (current?: Phone[]) => {
          const result = await transferPhone(payload);
          if (!result.success) {
            // Rollback localStorage al estado previo a esta transferencia
            syncToLocalStorage(current ?? phones);
            throw new Error(result.error || "Error al transferir");
          }
          const next = removeItem(current ?? phones);
          // Sync localStorage con la lista ya recortada para navegación instantánea
          syncToLocalStorage(next);
          return next;
        },
        {
          // optimisticData como función del estado actual del cache → seguro en batch
          optimisticData: (current?: Phone[]) => removeItem(current ?? phones),
          rollbackOnError: true,
          revalidate: false, // El backend deja snapshot+team_summary consistentes; revalidamos al final del batch.
        }
      );
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

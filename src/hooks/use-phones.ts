"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { getPhonesByTecnico, transferPhone } from "@/lib/api";
import type { Phone, TransferPayload } from "@/types";

interface UsePhonesOptions {
  tecnicoNombre: string;
  autoFetch?: boolean;
}

// Fetcher function for SWR
const phonesFetcher = async (tecnicoNombre: string): Promise<Phone[]> => {
  const result = await getPhonesByTecnico(tecnicoNombre);
  if (result.success && result.data) {
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
      revalidateOnFocus: true,           // Actualiza al volver a la tab
      revalidateOnReconnect: true,
      dedupingInterval: 2000,            // Reducido a 2s
      refreshInterval: 30000,            // Polling cada 30 segundos
      refreshWhenHidden: false,          // No polling si tab en background
      errorRetryCount: 3,                // Limitar reintentos
      errorRetryInterval: 5000,          // 5s entre reintentos
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

  const transfer = useCallback(
    async (payload: TransferPayload): Promise<void> => {
      // Optimistic update: remove the phone from the list immediately
      const optimisticPhones = phones.filter((p) => p.id !== payload.item_id);

      await mutate(
        async () => {
          const result = await transferPhone(payload);
          if (!result.success) {
            throw new Error(result.error || "Error al transferir");
          }
          // Solo retornamos optimistic - SWR hará el revalidate automático
          return optimisticPhones;
        },
        {
          optimisticData: optimisticPhones,
          rollbackOnError: true,
          revalidate: true, // SWR hace el fetch automáticamente después
        }
      );
    },
    [phones, mutate]
  );

  // isSyncing = está actualizando en background (no es carga inicial)
  const isSyncing = isValidating && !isLoading && phones.length > 0;

  return {
    phones,
    isLoading,
    isSyncing,          // Nuevo: sincronizando en background
    isTransferring: isValidating,
    error: error?.message || null,
    fetchPhones,
    transfer,
  };
}

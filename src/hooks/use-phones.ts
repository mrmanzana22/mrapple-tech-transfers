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
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
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
          // Fetch fresh data after transfer
          const freshResult = await getPhonesByTecnico(tecnicoNombre);
          if (freshResult.success && freshResult.data) {
            return freshResult.data;
          }
          return optimisticPhones;
        },
        {
          optimisticData: optimisticPhones,
          rollbackOnError: true,
          revalidate: true,
        }
      );
    },
    [phones, mutate, tecnicoNombre]
  );

  return {
    phones,
    isLoading,
    isTransferring: isValidating,
    error: error?.message || null,
    fetchPhones,
    transfer,
  };
}

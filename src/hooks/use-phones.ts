"use client";

import { useState, useCallback, useEffect } from "react";
import { getPhonesByTecnico, transferPhone } from "@/lib/api";
import type { Phone, TransferPayload } from "@/types";

interface UsePhonesOptions {
  tecnicoNombre: string;
  autoFetch?: boolean;
}

export function usePhones({ tecnicoNombre, autoFetch = true }: UsePhonesOptions) {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhones = useCallback(async () => {
    if (!tecnicoNombre) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getPhonesByTecnico(tecnicoNombre);

      if (result.success && result.data) {
        setPhones(result.data);
      } else {
        setError(result.error || "Error al obtener telefonos");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setIsLoading(false);
    }
  }, [tecnicoNombre]);

  const transfer = useCallback(
    async (payload: TransferPayload): Promise<void> => {
      setIsTransferring(true);

      try {
        const result = await transferPhone(payload);

        if (!result.success) {
          throw new Error(result.error || "Error al transferir");
        }

        // Refresh the phone list after successful transfer
        await fetchPhones();
      } finally {
        setIsTransferring(false);
      }
    },
    [fetchPhones]
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && tecnicoNombre) {
      fetchPhones();
    }
  }, [autoFetch, tecnicoNombre, fetchPhones]);

  return {
    phones,
    isLoading,
    isTransferring,
    error,
    fetchPhones,
    transfer,
  };
}

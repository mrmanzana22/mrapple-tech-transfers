"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { PhoneList } from "@/components/phone-list";
import { TransferModal } from "@/components/transfer-modal";
import { useAuth } from "@/hooks/use-auth";
import { usePhones } from "@/hooks/use-phones";
import { subscribeToPush, registerServiceWorker } from "@/lib/push";
import type { Phone, TransferPayload } from "@/types";

export default function TecnicoPage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading, logout } = useAuth();

  // Phone state
  const {
    phones,
    isLoading: phonesLoading,
    isSyncing,
    fetchPhones,
    transfer,
  } = usePhones({
    tecnicoNombre: tecnico?.nombre || "",
    autoFetch: !!tecnico,
  });

  // Modal state
  const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  // Push notifications subscription
  const pushSubscribed = useRef(false);
  useEffect(() => {
    if (!tecnico?.nombre || pushSubscribed.current) return;

    const setupPush = async () => {
      // Registrar Service Worker primero
      await registerServiceWorker();

      // Esperar un poco para que el usuario vea la página primero
      setTimeout(async () => {
        const subscribed = await subscribeToPush(tecnico.nombre);
        if (subscribed) {
          pushSubscribed.current = true;
          console.log('Push notifications enabled for:', tecnico.nombre);
        }
      }, 2000);
    };

    setupPush();
  }, [tecnico?.nombre]);

  // Handlers
  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPhones();
    setIsRefreshing(false);
    toast.success("Lista actualizada");
  }, [fetchPhones]);

  const handleTransferClick = useCallback((phone: Phone) => {
    setSelectedPhone(phone);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPhone(null);
  }, []);

  const handleTransferConfirm = useCallback(
    async (payload: TransferPayload) => {
      try {
        await transfer(payload);
        toast.success("Transferencia realizada correctamente");
        handleModalClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al transferir"
        );
        throw err;
      }
    },
    [transfer, handleModalClose]
  );

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header
        tecnicoNombre={tecnico?.nombre || ""}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isSyncing={isSyncing}
      />

      <main className="container mx-auto px-4 py-6">
        <PhoneList
          phones={phones}
          onTransfer={handleTransferClick}
          isLoading={phonesLoading}
        />
      </main>

      <TransferModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleTransferConfirm}
        phone={selectedPhone}
        currentTecnico={tecnico?.nombre || ""}
      />
    </div>
  );
}

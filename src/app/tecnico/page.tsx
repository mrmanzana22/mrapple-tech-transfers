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
import { getReparacionesCliente, cambiarEstadoReparacion, transferirReparacion } from "@/lib/api";
import type { Phone, TransferPayload, ReparacionCliente } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TecnicoPage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading, logout } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<"telefonos" | "clientes">("telefonos");

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

  // Reparaciones state
  const [reparaciones, setReparaciones] = useState<ReparacionCliente[]>([]);
  const [reparacionesLoading, setReparacionesLoading] = useState(false);
  const [changingEstado, setChangingEstado] = useState<string | null>(null);

  // Modal state - teléfonos
  const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state - reparaciones
  const [selectedReparacion, setSelectedReparacion] = useState<ReparacionCliente | null>(null);
  const [isReparacionModalOpen, setIsReparacionModalOpen] = useState(false);

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

  // Load reparaciones
  const loadReparaciones = useCallback(async () => {
    if (!tecnico?.nombre) return;
    setReparacionesLoading(true);
    try {
      const response = await getReparacionesCliente(tecnico.nombre);
      if (response.success && response.data) {
        setReparaciones(response.data);
      }
    } catch (error) {
      console.error("Error loading reparaciones:", error);
    } finally {
      setReparacionesLoading(false);
    }
  }, [tecnico?.nombre]);

  // Load reparaciones when switching to clientes tab
  useEffect(() => {
    if (activeTab === "clientes" && reparaciones.length === 0) {
      loadReparaciones();
    }
  }, [activeTab, reparaciones.length, loadReparaciones]);

  // Handlers
  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (activeTab === "telefonos") {
      await fetchPhones();
    } else {
      await loadReparaciones();
    }
    setIsRefreshing(false);
    toast.success("Lista actualizada");
  }, [fetchPhones, loadReparaciones, activeTab]);

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

  const handleReparadoOficina = async (itemId: string) => {
    setChangingEstado(itemId);
    try {
      const response = await cambiarEstadoReparacion(itemId, "REPARADO OFICINA");
      if (response.success) {
        toast.success("Estado actualizado a Reparado oficina");
        loadReparaciones();
      } else {
        toast.error(response.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setChangingEstado(null);
    }
  };

  const handleTransferReparacionClick = useCallback((reparacion: ReparacionCliente) => {
    setSelectedReparacion(reparacion);
    setIsReparacionModalOpen(true);
  }, []);

  const handleReparacionModalClose = useCallback(() => {
    setIsReparacionModalOpen(false);
    setSelectedReparacion(null);
  }, []);

  const handleTransferReparacionConfirm = useCallback(
    async (payload: TransferPayload) => {
      try {
        const response = await transferirReparacion({
          item_id: payload.item_id,
          tecnico_actual: payload.tecnico_actual,
          tecnico_actual_nombre: payload.tecnico_actual_nombre,
          nuevo_tecnico: payload.nuevo_tecnico,
          comentario: payload.comentario,
          foto: payload.foto,
        });

        if (response.success) {
          toast.success("Reparación transferida correctamente");
          handleReparacionModalClose();
          loadReparaciones();
        } else {
          throw new Error(response.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al transferir");
        throw err;
      }
    },
    [handleReparacionModalClose, loadReparaciones]
  );

  // Get estado badge color
  const getEstadoBadge = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes("reparado")) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{estado}</Badge>;
    }
    if (estadoLower.includes("pendiente") || estadoLower.includes("espera")) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{estado}</Badge>;
    }
    if (estadoLower.includes("proceso") || estadoLower.includes("reparando")) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{estado}</Badge>;
    }
    return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">{estado}</Badge>;
  };

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

      {/* Tabs */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("telefonos")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "telefonos" ? "bg-zinc-800 text-white" : "text-zinc-400"
            }`}
          >
            Teléfonos
          </button>
          <button
            onClick={() => setActiveTab("clientes")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "clientes" ? "bg-zinc-800 text-white" : "text-zinc-400"
            }`}
          >
            Clientes
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "telefonos" ? (
          <PhoneList
            phones={phones}
            onTransfer={handleTransferClick}
            isLoading={phonesLoading}
          />
        ) : (
          /* Clientes tab content */
          <div className="space-y-4">
            {reparacionesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reparaciones.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                No hay reparaciones de clientes asignadas
              </div>
            ) : (
              reparaciones.map((rep) => (
                <Card key={rep.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          {rep.cliente_nombre} {rep.cliente_apellido}
                        </h3>
                        <p className="text-sm text-zinc-400">{rep.cliente_telefono}</p>
                      </div>
                      {getEstadoBadge(rep.estado)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-zinc-500">Tipo:</span>
                        <span className="text-zinc-300 ml-2">{rep.tipo_reparacion}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">IMEI:</span>
                        <span className="text-zinc-300 ml-2 font-mono">
                          ...{rep.imei.slice(-8)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Fecha:</span>
                        <span className="text-zinc-300 ml-2">{rep.fecha}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Valor:</span>
                        <span className="text-zinc-300 ml-2">${rep.valor.toLocaleString()}</span>
                      </div>
                    </div>

                    {!rep.estado.toLowerCase().includes("reparado oficina") && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReparadoOficina(rep.id)}
                          disabled={changingEstado === rep.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {changingEstado === rep.id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Actualizando...
                            </span>
                          ) : (
                            "Reparado Oficina"
                          )}
                        </Button>
                        <Button
                          onClick={() => handleTransferReparacionClick(rep)}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          Transferir
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      <TransferModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleTransferConfirm}
        phone={selectedPhone}
        currentTecnico={tecnico?.nombre || ""}
      />

      {selectedReparacion && (
        <TransferModal
          isOpen={isReparacionModalOpen}
          onClose={handleReparacionModalClose}
          onConfirm={handleTransferReparacionConfirm}
          phone={{
            id: selectedReparacion.id,
            nombre: `${selectedReparacion.cliente_nombre} ${selectedReparacion.cliente_apellido}`,
            imei: selectedReparacion.imei,
            estado: selectedReparacion.estado,
            color: "",
            grado: "",
            gb: "",
            estado_bateria: "",
            fecha_entrega: selectedReparacion.fecha,
            tecnico: selectedReparacion.asignado_a,
          }}
          currentTecnico={tecnico?.nombre || ""}
        />
      )}
    </div>
  );
}

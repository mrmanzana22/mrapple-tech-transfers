"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { PhoneList } from "@/components/phone-list";
import { TransferModal } from "@/components/transfer-modal";
import { useAuth } from "@/hooks/use-auth";
import { usePhones } from "@/hooks/use-phones";
import { useReparaciones } from "@/hooks/use-reparaciones";
import { subscribeToPush, registerServiceWorker } from "@/lib/push";
import { cambiarEstadoReparacion, transferirReparacion, fetchAllTecnicosWithPhones, type TecnicoWithPhones, fetchTecnicosActivos, getReparacionesCliente } from "@/lib/api";
import type { Phone, TransferPayload, ReparacionCliente } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PhoneCard } from "@/components/phone-card";
import { ChevronDown, UserCircle, XCircle, Search, X, ArrowRightLeft } from "lucide-react";

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TecnicoPage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading, logout } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<"telefonos" | "clientes" | "equipo">("telefonos");

  // Team state (Equipo tab)
  const [teamData, setTeamData] = useState<TecnicoWithPhones[]>([]);
  const [expandedTecnicos, setExpandedTecnicos] = useState<Set<string>>(new Set());
  const [teamLoading, setTeamLoading] = useState(false);
  const [equipoSubTab, setEquipoSubTab] = useState<"telefonos" | "clientes">("telefonos");
  const [teamClientesData, setTeamClientesData] = useState<{ tecnico: string; reparaciones: ReparacionCliente[] }[]>([]);
  const [teamClientesLoading, setTeamClientesLoading] = useState(false);

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

  // Reparaciones state (SWR - cached + instant load)
  const {
    reparaciones,
    isLoading: reparacionesLoading,
    refresh: refreshReparaciones,
    mutate: mutateReparaciones,
  } = useReparaciones({
    tecnicoNombre: tecnico?.nombre || "",
    autoFetch: !!tecnico && activeTab === "clientes",
  });
  const [changingEstado, setChangingEstado] = useState<string | null>(null);

  // Modal state - teléfonos
  const [selectedPhone, setSelectedPhone] = useState<Phone | null>(null);
  const [selectedPhones, setSelectedPhones] = useState<Phone[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state - reparaciones
  const [selectedReparacion, setSelectedReparacion] = useState<ReparacionCliente | null>(null);
  const [isReparacionModalOpen, setIsReparacionModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filtered phones by IMEI
  const filteredPhones = useMemo(() => {
    if (!debouncedSearch.trim()) return phones;
    const query = debouncedSearch.toLowerCase().trim();
    return phones.filter((phone) =>
      phone.imei?.toLowerCase().includes(query)
    );
  }, [phones, debouncedSearch]);

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

  // Reparaciones auto-fetch when tab is active (handled by useReparaciones hook)

  // Load team data
  const loadTeamData = useCallback(async () => {
    setTeamLoading(true);
    try {
      const data = await fetchAllTecnicosWithPhones();
      setTeamData(data);
      // Expand first tecnico by default
      if (data.length > 0) {
        setExpandedTecnicos(new Set([data[0].nombre]));
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // Load team data when switching to equipo tab
  useEffect(() => {
    if (activeTab === "equipo" && teamData.length === 0) {
      loadTeamData();
    }
  }, [activeTab, teamData.length, loadTeamData]);

  // Toggle tecnico expansion
  const toggleTecnico = useCallback((nombre: string) => {
    setExpandedTecnicos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });
  }, []);

  // Load team clientes data
  const loadTeamClientesData = useCallback(async () => {
    setTeamClientesLoading(true);
    try {
      const tecnicos = await fetchTecnicosActivos();
      const results = await Promise.all(
        tecnicos.map(async (nombre) => {
          const response = await getReparacionesCliente(nombre);
          return {
            tecnico: nombre,
            reparaciones: response.success ? (response.data ?? []) : [],
          };
        })
      );
      // Sort by count and filter empty
      setTeamClientesData(
        results
          .filter((r) => r.reparaciones.length > 0)
          .sort((a, b) => b.reparaciones.length - a.reparaciones.length)
      );
      // Expand first tecnico by default
      if (results.length > 0 && results[0].reparaciones.length > 0) {
        setExpandedTecnicos((prev) => {
          const next = new Set(prev);
          next.add(results[0].tecnico);
          return next;
        });
      }
    } catch (error) {
      console.error("Error loading team clientes:", error);
    } finally {
      setTeamClientesLoading(false);
    }
  }, []);

  // Load team clientes when switching to equipo/clientes sub-tab
  useEffect(() => {
    if (activeTab === "equipo" && equipoSubTab === "clientes" && teamClientesData.length === 0) {
      loadTeamClientesData();
    }
  }, [activeTab, equipoSubTab, teamClientesData.length, loadTeamClientesData]);

  // Handlers
  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (activeTab === "telefonos") {
      await fetchPhones();
    } else if (activeTab === "clientes") {
      await refreshReparaciones();
    } else if (activeTab === "equipo") {
      if (equipoSubTab === "telefonos") {
        await loadTeamData();
      } else {
        await loadTeamClientesData();
      }
    }
    setIsRefreshing(false);
    toast.success("Lista actualizada");
  }, [fetchPhones, refreshReparaciones, loadTeamData, loadTeamClientesData, activeTab, equipoSubTab]);

  const handleTransferClick = useCallback((phone: Phone) => {
    setSelectedPhone(phone);
    setSelectedPhones([]);
    setIsModalOpen(true);
  }, []);

  const handleBatchTransferClick = useCallback((phones: Phone[]) => {
    setSelectedPhone(null);
    setSelectedPhones(phones);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPhone(null);
    setSelectedPhones([]);
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

  const handleBatchTransferConfirm = useCallback(
    async (payloads: TransferPayload[]) => {
      try {
        // Execute transfers sequentially to avoid rate limits
        let successCount = 0;
        let errorCount = 0;

        for (const payload of payloads) {
          try {
            await transfer(payload);
            successCount++;
          } catch {
            errorCount++;
          }
        }

        if (errorCount === 0) {
          toast.success(`${successCount} transferencias realizadas correctamente`);
        } else if (successCount > 0) {
          toast.warning(`${successCount} exitosas, ${errorCount} fallidas`);
        } else {
          toast.error("Error en todas las transferencias");
        }

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

  const handleReparadoOficina = async (reparacion: ReparacionCliente) => {
    setChangingEstado(reparacion.id);
    try {
      const response = await cambiarEstadoReparacion(
        reparacion,
        "REPARADO OFICINA",
        tecnico?.nombre || ""
      );
      if (response.success) {
        toast.success("Estado actualizado a Reparado oficina");
        // Optimistic: update local state, then revalidate in background
        mutateReparaciones(
          (current) => current?.filter((r) => r.id !== reparacion.id),
          { revalidate: false }
        );
        setTimeout(() => mutateReparaciones(), 1500);
      } else {
        toast.error(response.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setChangingEstado(null);
    }
  };

  const handleNoReparado = async (reparacion: ReparacionCliente) => {
    setChangingEstado(reparacion.id);
    try {
      const response = await cambiarEstadoReparacion(
        reparacion,
        "no se pudo arreglar",
        tecnico?.nombre || ""
      );
      if (response.success) {
        toast.success("Equipo marcado como no reparado");
        mutateReparaciones(
          (current) => current?.filter((r) => r.id !== reparacion.id),
          { revalidate: false }
        );
        setTimeout(() => mutateReparaciones(), 1500);
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
        // Optimistic: remove from list immediately
        mutateReparaciones(
          (current) => current?.filter((r) => r.id !== payload.item_id),
          { revalidate: false }
        );

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
          // Soft revalidate in background
          setTimeout(() => mutateReparaciones(), 1500);
        } else {
          // Rollback on error
          mutateReparaciones();
          throw new Error(response.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al transferir");
        throw err;
      }
    },
    [handleReparacionModalClose, mutateReparaciones]
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
          {tecnico?.puede_ver_equipo && (
            <button
              onClick={() => setActiveTab("equipo")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "equipo" ? "bg-zinc-800 text-white" : "text-zinc-400"
              }`}
            >
              Equipo
            </button>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "telefonos" ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Buscar por IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-zinc-900 border-zinc-800 focus:border-zinc-700 placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded-full transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            </div>

            {/* Results counter when filtering */}
            {debouncedSearch.trim() && (
              <p className="text-sm text-zinc-500">
                {filteredPhones.length} de {phones.length} teléfono{phones.length !== 1 ? "s" : ""}
              </p>
            )}

            <PhoneList
              phones={filteredPhones}
              onTransfer={handleTransferClick}
              onBatchTransfer={handleBatchTransferClick}
              isLoading={phonesLoading}
            />
          </div>
        ) : activeTab === "clientes" ? (
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
                        <p className="text-sm text-zinc-300 mt-1">{rep.nombre}</p>
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
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Primary action - full width on mobile */}
                        <Button
                          onClick={() => handleReparadoOficina(rep)}
                          disabled={changingEstado === rep.id}
                          size="sm"
                          className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
                        >
                          {changingEstado === rep.id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span className="hidden sm:inline">Actualizando...</span>
                            </span>
                          ) : (
                            <>
                              <span className="sm:hidden">Reparado</span>
                              <span className="hidden sm:inline">Reparado Oficina</span>
                            </>
                          )}
                        </Button>

                        {/* Secondary actions - side by side on mobile */}
                        <div className="flex gap-2 order-2 sm:order-1 sm:contents">
                          <Button
                            onClick={() => handleNoReparado(rep)}
                            disabled={changingEstado === rep.id}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none text-red-500 border-red-500/30 hover:bg-red-500/10"
                          >
                            {changingEstado === rep.id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">No Reparado</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleTransferReparacionClick(rep)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          >
                            <ArrowRightLeft className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Transferir</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : tecnico?.puede_ver_equipo ? (
          /* Equipo tab content */
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setEquipoSubTab("telefonos")}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-all ${
                  equipoSubTab === "telefonos" ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
              >
                Teléfonos
              </button>
              <button
                onClick={() => setEquipoSubTab("clientes")}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-all ${
                  equipoSubTab === "clientes" ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
              >
                Clientes
              </button>
            </div>

            {/* Telefonos sub-tab */}
            {equipoSubTab === "telefonos" && (
              <>
                {teamLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <Skeleton className="h-6 w-48 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : teamData.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    No hay técnicos disponibles
                  </div>
                ) : (
                  teamData.map((tec) => (
                    <Card key={tec.nombre} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                      <button
                        onClick={() => toggleTecnico(tec.nombre)}
                        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-8 h-8 text-zinc-500" />
                          <div className="text-left">
                            <h3 className="font-semibold text-white">{tec.nombre}</h3>
                            <p className="text-sm text-zinc-400">
                              {tec.phones.length} teléfono{tec.phones.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-zinc-400 transition-transform ${
                            expandedTecnicos.has(tec.nombre) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedTecnicos.has(tec.nombre) && (
                        <CardContent className="pt-0 pb-4 px-4 border-t border-zinc-800">
                          {tec.phones.length === 0 ? (
                            <p className="text-zinc-500 text-sm py-4 text-center">
                              Sin teléfonos asignados
                            </p>
                          ) : (
                            <div className="grid gap-3 mt-4">
                              {tec.phones.map((phone) => (
                                <PhoneCard
                                  key={phone.id}
                                  phone={phone}
                                  showTransferButton={false}
                                />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Clientes sub-tab */}
            {equipoSubTab === "clientes" && (
              <>
                {teamClientesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-4">
                          <Skeleton className="h-6 w-48 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : teamClientesData.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    No hay reparaciones de clientes asignadas
                  </div>
                ) : (
                  teamClientesData.map((item) => (
                    <Card key={item.tecnico} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                      <button
                        onClick={() => toggleTecnico(item.tecnico)}
                        className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-8 h-8 text-zinc-500" />
                          <div className="text-left">
                            <h3 className="font-semibold text-white">{item.tecnico}</h3>
                            <p className="text-sm text-zinc-400">
                              {item.reparaciones.length} reparación{item.reparaciones.length !== 1 ? "es" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-zinc-400 transition-transform ${
                            expandedTecnicos.has(item.tecnico) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedTecnicos.has(item.tecnico) && (
                        <CardContent className="pt-0 pb-4 px-4 border-t border-zinc-800">
                          <div className="divide-y divide-zinc-800 mt-2">
                            {item.reparaciones.map((rep) => (
                              <div key={rep.id} className="py-3 flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-white">
                                    {rep.cliente_nombre} {rep.cliente_apellido}
                                  </p>
                                  <p className="text-xs text-zinc-300">
                                    {rep.nombre}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {rep.tipo_reparacion} • ...{rep.imei?.slice(-8) || "Sin IMEI"}
                                  </p>
                                </div>
                                {getEstadoBadge(rep.estado)}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        ) : null}
      </main>

      <TransferModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleTransferConfirm}
        onBatchConfirm={handleBatchTransferConfirm}
        phone={selectedPhone}
        phones={selectedPhones.length > 0 ? selectedPhones : undefined}
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

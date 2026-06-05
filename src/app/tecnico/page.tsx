"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { PhoneList } from "@/components/phone-list";
import { TransferModal } from "@/components/transfer-modal";
import { HistorialTab } from "@/components/historial-tab";
import { TransferProgress, type TransferJob } from "@/components/transfer-progress";
import { useAuth } from "@/hooks/use-auth";
import { usePhones } from "@/hooks/use-phones";
import { useReparaciones } from "@/hooks/use-reparaciones";
import { subscribeToPush, registerServiceWorker } from "@/lib/push";
import { cambiarEstadoReparacion, transferirReparacion, fetchAllTecnicosWithPhones, type TecnicoWithPhones, fetchTecnicosActivos, getReparacionesCliente, getPhonesByTecnico } from "@/lib/api";
import type { Phone, TransferPayload, ReparacionCliente } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PhoneCard } from "@/components/phone-card";
import { ChevronDown, UserCircle, XCircle, Search, X, ArrowRightLeft, GraduationCap } from "lucide-react";
import { canAccessTraining } from "@/lib/training";
import { Reveal } from "@/components/motion";

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
  const [activeTab, setActiveTab] = useState<"telefonos" | "clientes" | "equipo" | "historial">("telefonos");

  // Team state (Equipo tab)
  const [teamData, setTeamData] = useState<TecnicoWithPhones[]>([]);
  const [expandedTecnicos, setExpandedTecnicos] = useState<Set<string>>(new Set());
  const [loadingTeamPhones, setLoadingTeamPhones] = useState<Set<string>>(new Set());
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
    hidePhones,
  } = usePhones({
    tecnicoNombre: tecnico?.nombre || "",
    autoFetch: !!tecnico,
  });

  // Reparaciones state (SWR - cached + instant load)
  const {
    reparaciones,
    isLoading: reparacionesLoading,
    refresh: refreshReparaciones,
    forceRefresh: forceRefreshReparaciones,
    removeFromCache: removeReparacionesFromCache,
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
  const [transferJob, setTransferJob] = useState<TransferJob | null>(null);
  // Cola de transferencias en background (permite seguir mandando más).
  const transferQueueRef = useRef<TransferPayload[]>([]);
  const transferWorkingRef = useRef(false);
  const transferStatsRef = useRef({ total: 0, done: 0, ok: 0, fail: 0, firstError: "" });
  const transferHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Load team data: fast from resumen, then update counts in background
  const loadTeamData = useCallback(async () => {
    setTeamLoading(true);
    let initialData: TecnicoWithPhones[] = [];
    try {
      initialData = await fetchAllTecnicosWithPhones();
      setTeamData(initialData);
      if (initialData.length > 0) {
        setExpandedTecnicos(new Set([initialData[0].nombre]));
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setTeamLoading(false);
    }

    // Background: fetch real phone counts per technician (doesn't block UI)
    if (initialData.length > 0) {
      Promise.all(
        initialData.map(async (tec) => {
          try {
            const response = await getPhonesByTecnico(tec.nombre);
            if (response.success && response.data) {
              return { ...tec, phones: response.data, phonesCount: response.data.length };
            }
          } catch {}
          return tec;
        })
      ).then(updated => {
        setTeamData(updated.sort((a, b) => (b.phonesCount ?? 0) - (a.phonesCount ?? 0)));
      });
    }
  }, []);

  // Load team data when switching to equipo tab
  useEffect(() => {
    if (activeTab === "equipo" && teamData.length === 0) {
      loadTeamData();
    }
  }, [activeTab, teamData.length, loadTeamData]);

  // Toggle tecnico expansion
  const toggleTecnico = useCallback(async (nombre: string) => {
    const shouldExpand = !expandedTecnicos.has(nombre);

    setExpandedTecnicos((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });

    if (!shouldExpand) return;

    const tecnicoData = teamData.find((t) => t.nombre === nombre);
    const alreadyLoaded = (tecnicoData?.phones?.length || 0) > 0;

    if (alreadyLoaded) return;

    setLoadingTeamPhones((prev) => {
      const next = new Set(prev);
      next.add(nombre);
      return next;
    });

    try {
      const result = await getPhonesByTecnico(nombre);
      if (result.success && result.data) {
        setTeamData((prev) =>
          prev.map((item) =>
            item.nombre === nombre
              ? {
                  ...item,
                  phones: result.data ?? [],
                  phonesCount: result.data?.length ?? item.phonesCount ?? 0,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error loading phones for tecnico:", nombre, error);
    } finally {
      setLoadingTeamPhones((prev) => {
        const next = new Set(prev);
        next.delete(nombre);
        return next;
      });
    }
  }, [expandedTecnicos, teamData]);

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

  // Procesa la cola de transferencias en background, en paralelo (con tope de
  // concurrencia para no reventar los rate limits de Monday). Sigue drenando
  // todo lo que se vaya agregando mientras corre, así el técnico puede seguir
  // mandando más teléfonos sin esperar. Actualiza el indicador flotante.
  const TRANSFER_CONCURRENCY = 4;
  const drainTransferQueue = useCallback(async () => {
    if (transferWorkingRef.current) return;
    transferWorkingRef.current = true;
    try {
      // Drena hasta vaciar, reincorporando lo que llegue durante el proceso.
      while (true) {
        while (transferQueueRef.current.length > 0) {
          const batch = transferQueueRef.current.splice(0, TRANSFER_CONCURRENCY);
          await Promise.all(
            batch.map(async (payload) => {
              try {
                await transfer(payload);
                transferStatsRef.current.ok++;
              } catch (err) {
                const reason = err instanceof Error ? err.message : "Error desconocido";
                transferStatsRef.current.fail++;
                if (!transferStatsRef.current.firstError) transferStatsRef.current.firstError = reason;
                console.error("[transfer-queue] failed", payload.item_id, reason);
              } finally {
                transferStatsRef.current.done++;
                setTransferJob({
                  total: transferStatsRef.current.total,
                  done: transferStatsRef.current.done,
                  fail: transferStatsRef.current.fail,
                });
              }
            })
          );
        }
        // Cola vacía: revalidar. Si llegó algo durante el fetch, seguimos.
        await fetchPhones();
        if (transferQueueRef.current.length > 0) continue;
        break;
      }

      // Resumen del lote.
      const { ok, fail, firstError } = transferStatsRef.current;
      if (fail === 0) {
        toast.success(
          ok === 1 ? "Transferencia realizada correctamente" : `${ok} transferencias realizadas correctamente`
        );
      } else if (ok > 0) {
        toast.warning(`${ok} exitosas, ${fail} fallidas`);
      } else {
        toast.error(firstError || "Error al transferir");
      }

      // Dejar el estado final visible un momento y ocultar el indicador.
      if (transferHideTimerRef.current) clearTimeout(transferHideTimerRef.current);
      transferHideTimerRef.current = setTimeout(() => {
        setTransferJob(null);
        transferStatsRef.current = { total: 0, done: 0, ok: 0, fail: 0, firstError: "" };
        transferHideTimerRef.current = null;
      }, 2500);
    } finally {
      transferWorkingRef.current = false;
    }
  }, [transfer, fetchPhones]);

  // Encola un lote: oculta los teléfonos al instante y arranca/continúa el worker.
  const enqueueTransfers = useCallback(
    (payloads: TransferPayload[]) => {
      if (payloads.length === 0) return;

      // Si el indicador estaba idle (en su ventana de auto-ocultado), arrancamos
      // un lote limpio; si hay uno corriendo, acumulamos sobre él.
      if (!transferWorkingRef.current && transferQueueRef.current.length === 0) {
        if (transferHideTimerRef.current) {
          clearTimeout(transferHideTimerRef.current);
          transferHideTimerRef.current = null;
        }
        transferStatsRef.current = { total: 0, done: 0, ok: 0, fail: 0, firstError: "" };
      }

      // Desaparecen TODOS de una (optimista + ghost filter), sin esperar la red.
      hidePhones(payloads.map((p) => p.item_id));

      transferStatsRef.current.total += payloads.length;
      transferQueueRef.current.push(...payloads);
      setTransferJob({
        total: transferStatsRef.current.total,
        done: transferStatsRef.current.done,
        fail: transferStatsRef.current.fail,
      });
      void drainTransferQueue();
    },
    [hidePhones, drainTransferQueue]
  );

  const handleTransferConfirm = useCallback(
    async (payload: TransferPayload) => {
      handleModalClose();
      enqueueTransfers([payload]);
    },
    [handleModalClose, enqueueTransfers]
  );

  const handleBatchTransferConfirm = useCallback(
    async (payloads: TransferPayload[]) => {
      handleModalClose();
      enqueueTransfers(payloads);
    },
    [handleModalClose, enqueueTransfers]
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
        // Remove from SWR + localStorage so page navigation shows correct data
        removeReparacionesFromCache([reparacion.id]);
        // Exclude this item from refresh to prevent reappearing before Monday propagates
        setTimeout(() => forceRefreshReparaciones([reparacion.id]).catch(() => {}), 2000);
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
        removeReparacionesFromCache([reparacion.id]);
        setTimeout(() => forceRefreshReparaciones([reparacion.id]).catch(() => {}), 2000);
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
        // Remove from SWR + localStorage so page navigation shows correct data
        removeReparacionesFromCache([payload.item_id]);

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
          // Soft revalidate in background, excluding transferred item
          setTimeout(() => forceRefreshReparaciones([payload.item_id]).catch(() => {}), 2000);
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
    [handleReparacionModalClose, removeReparacionesFromCache, forceRefreshReparaciones, mutateReparaciones]
  );

  // Get estado badge color
  const getEstadoBadge = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes("reparado")) {
      return <Badge className="border-transparent bg-primary/15 text-primary ring-1 ring-inset ring-primary/25">{estado}</Badge>;
    }
    if (estadoLower.includes("pendiente") || estadoLower.includes("espera")) {
      return <Badge className="border-transparent bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25">{estado}</Badge>;
    }
    if (estadoLower.includes("proceso") || estadoLower.includes("reparando")) {
      return <Badge className="border-transparent bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/25">{estado}</Badge>;
    }
    return <Badge className="border-transparent bg-secondary text-muted-foreground ring-1 ring-inset ring-border">{estado}</Badge>;
  };

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        tecnicoNombre={tecnico?.nombre || ""}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isSyncing={isSyncing}
      />

      {/* Training Banner - Only for NORMAN and IDEL */}
      {tecnico && canAccessTraining(tecnico.nombre) && (
        <div className="container mx-auto px-4 pt-4">
          <button
            onClick={() => router.push('/tecnico/entrenamiento')}
            className="pressable w-full flex items-center gap-3 p-3.5 rounded-2xl surface shadow-e1 sheen hover:border-primary/30 transition-[border-color,box-shadow] duration-base ease-out-quint group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-inset ring-primary/25 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">Entrenamiento Microsoldadura</p>
              <p className="text-xs text-muted-foreground mt-0.5">Continúa tu progreso</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:translate-x-0.5 transition-transform duration-base ease-out-quint" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex gap-1 surface p-1 rounded-2xl shadow-e1">
          <button
            onClick={() => setActiveTab("telefonos")}
            className={`pressable-sm flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-quint ${
              activeTab === "telefonos" ? "bg-secondary text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            Teléfonos
          </button>
          <button
            onClick={() => setActiveTab("clientes")}
            className={`pressable-sm flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-quint ${
              activeTab === "clientes" ? "bg-secondary text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            Clientes
          </button>
          {tecnico?.puede_ver_equipo && (
            <button
              onClick={() => setActiveTab("equipo")}
              className={`pressable-sm flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-quint ${
                activeTab === "equipo" ? "bg-secondary text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              Equipo
            </button>
          )}
          <button
            onClick={() => setActiveTab("historial")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "historial" ? "bg-zinc-800 text-white" : "text-zinc-400"
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {activeTab === "telefonos" ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-11 h-11 rounded-xl tabular-nums"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full transition-colors duration-fast ease-out-quint"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Results counter when filtering */}
            {debouncedSearch.trim() && (
              <p className="text-sm text-muted-foreground tabular-nums animate-fade-in">
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
                  <Card key={i} className="skeleton-shimmer">
                    <CardContent className="p-5">
                      <Skeleton className="h-6 w-48 mb-2.5 bg-secondary" />
                      <Skeleton className="h-4 w-32 mb-2 bg-secondary" />
                      <Skeleton className="h-4 w-24 bg-secondary" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reparaciones.length === 0 ? (
              <Reveal y={16} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-5 rounded-2xl bg-secondary ring-1 ring-inset ring-border mb-5">
                  <UserCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No hay reparaciones de clientes asignadas
                </p>
              </Reveal>
            ) : (
              reparaciones.map((rep, i) => (
                <Reveal key={rep.id} y={20} delay={Math.min(i * 0.04, 0.32)} className="card-hover">
                <Card className="sheen">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {rep.cliente_nombre} {rep.cliente_apellido}
                        </h3>
                        <p className="text-sm text-muted-foreground tabular-nums mt-0.5">{rep.cliente_telefono}</p>
                        <p className="text-sm text-foreground/80 mt-1.5">{rep.nombre}</p>
                      </div>
                      {getEstadoBadge(rep.estado)}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm mb-4 rounded-xl bg-background/40 ring-1 ring-inset ring-border/60 p-3.5">
                      <div className="min-w-0">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="text-foreground/80 ml-2">{rep.tipo_reparacion}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground">IMEI:</span>
                        <span className="text-foreground/80 ml-2 font-mono tabular-nums">
                          ...{rep.imei.slice(-8)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="text-foreground/80 ml-2 tabular-nums">{rep.fecha}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="text-foreground/80 ml-2 tabular-nums">${rep.valor.toLocaleString()}</span>
                      </div>
                    </div>

                    {!rep.estado.toLowerCase().includes("reparado oficina") && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Primary action - full width on mobile */}
                        <Button
                          onClick={() => handleReparadoOficina(rep)}
                          disabled={changingEstado === rep.id}
                          size="sm"
                          className="w-full sm:flex-1 order-1 sm:order-2"
                        >
                          {changingEstado === rep.id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                            className="flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          >
                            {changingEstado === rep.id ? (
                              <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                <span className="sm:hidden">Falló</span>
                                <span className="hidden sm:inline">No Reparado</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleTransferReparacionClick(rep)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            <span className="sm:hidden">Mover</span>
                            <span className="hidden sm:inline">Transferir</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </Reveal>
              ))
            )}
          </div>
        ) : activeTab === "equipo" && tecnico?.puede_ver_equipo ? (
          /* Equipo tab content */
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-secondary/60 p-1 rounded-xl ring-1 ring-inset ring-border">
              <button
                onClick={() => setEquipoSubTab("telefonos")}
                className={`pressable-sm flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-quint ${
                  equipoSubTab === "telefonos" ? "bg-popover text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                Teléfonos
              </button>
              <button
                onClick={() => setEquipoSubTab("clientes")}
                className={`pressable-sm flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-base ease-out-quint ${
                  equipoSubTab === "clientes" ? "bg-popover text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground/80"
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
                      <Card key={i} className="skeleton-shimmer">
                        <CardContent className="p-5">
                          <Skeleton className="h-6 w-48 mb-2.5 bg-secondary" />
                          <Skeleton className="h-4 w-24 bg-secondary" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : teamData.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No hay técnicos disponibles
                  </div>
                ) : (
                  teamData.map((tec, i) => {
                    const isExpanded = expandedTecnicos.has(tec.nombre);
                    return (
                    <Reveal key={tec.nombre} y={18} delay={Math.min(i * 0.04, 0.32)}>
                    <Card className={`overflow-hidden transition-[border-color] duration-base ease-out-quint ${isExpanded ? "border-border" : ""}`}>
                      <button
                        onClick={() => toggleTecnico(tec.nombre)}
                        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors duration-fast ease-out-quint"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-inset ring-border flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-foreground">{tec.nombre}</h3>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              {(tec.phonesCount ?? tec.phones.length)} teléfono{(tec.phonesCount ?? tec.phones.length) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-base ease-out-quint ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <CardContent className="pt-0 pb-4 px-4 hairline-t">
                          {loadingTeamPhones.has(tec.nombre) ? (
                            <div className="grid gap-3 mt-4">
                              {[1, 2].map((i) => (
                                <Skeleton key={i} className="h-24 w-full bg-secondary" />
                              ))}
                            </div>
                          ) : tec.phones.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">
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
                    </Reveal>
                    );
                  })
                )}
              </>
            )}

            {/* Clientes sub-tab */}
            {equipoSubTab === "clientes" && (
              <>
                {teamClientesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="skeleton-shimmer">
                        <CardContent className="p-5">
                          <Skeleton className="h-6 w-48 mb-2.5 bg-secondary" />
                          <Skeleton className="h-4 w-24 bg-secondary" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : teamClientesData.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No hay reparaciones de clientes asignadas
                  </div>
                ) : (
                  teamClientesData.map((item, i) => {
                    const isExpanded = expandedTecnicos.has(item.tecnico);
                    return (
                    <Reveal key={item.tecnico} y={18} delay={Math.min(i * 0.04, 0.32)}>
                    <Card className="overflow-hidden">
                      <button
                        onClick={() => toggleTecnico(item.tecnico)}
                        className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors duration-fast ease-out-quint"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-inset ring-border flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-foreground">{item.tecnico}</h3>
                            <p className="text-sm text-muted-foreground tabular-nums">
                              {item.reparaciones.length} reparación{item.reparaciones.length !== 1 ? "es" : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-base ease-out-quint ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <CardContent className="pt-0 pb-2 px-4 hairline-t">
                          <div className="divide-y divide-border mt-2">
                            {item.reparaciones.map((rep) => (
                              <div key={rep.id} className="py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm text-foreground truncate">
                                    {rep.cliente_nombre} {rep.cliente_apellido}
                                  </p>
                                  <p className="text-xs text-foreground/70 mt-0.5">
                                    {rep.nombre}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
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
                    </Reveal>
                    );
                  })
                )}
              </>
            )}
          </div>
        ) : activeTab === "historial" ? (
          <HistorialTab />
        ) : null}
      </main>

      {transferJob && <TransferProgress job={transferJob} />}

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

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
import { cambiarEstadoReparacion, transferirReparacion, fetchAllTecnicosWithPhones, type TecnicoWithPhones, fetchTecnicosActivos, getReparacionesCliente, getPhonesByTecnico, generateRequestId } from "@/lib/api";
import type { Phone, TransferPayload, ReparacionCliente } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PhoneCard } from "@/components/phone-card";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { gsap, useGSAP, EASE, DURATION, prefersReducedMotion } from "@/lib/gsap";
import { ChevronDown, ChevronRight, UserCircle, XCircle, Search, X, ArrowRightLeft, GraduationCap, Smartphone, Phone as PhoneIcon, Wrench } from "lucide-react";
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
  const [loadingTeamPhones, setLoadingTeamPhones] = useState<Set<string>>(new Set());
  // Detalle de equipos de un técnico (sheet) + búsqueda por IMEI dentro de él.
  const [equipoDetalle, setEquipoDetalle] = useState<string | null>(null);
  const [equipoBusqueda, setEquipoBusqueda] = useState("");
  // Lo mismo para reparaciones de clientes de un técnico.
  const [equipoCliDetalle, setEquipoCliDetalle] = useState<string | null>(null);
  const [equipoCliBusqueda, setEquipoCliBusqueda] = useState("");
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
    restoreToCache: restoreReparacionesToCache,
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
  // Cola de transferencias de reparaciones en background (mismo patrón que los
  // teléfonos: cerrar modal al instante + mandar la red por detrás). Guardamos
  // la reparación completa junto al payload para poder hacer rollback si falla.
  const reparacionQueueRef = useRef<{ payload: TransferPayload; reparacion: ReparacionCliente }[]>([]);
  const reparacionWorkingRef = useRef(false);
  const reparacionStatsRef = useRef({ total: 0, done: 0, ok: 0, fail: 0, firstError: "" });
  const reparacionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bottom-sheet de detalle de reparación (presentación; vista del equipo).
  const [repDetalle, setRepDetalle] = useState<ReparacionCliente | null>(null);

  // Transición de contenido al cambiar de pestaña (presentación). El contenido
  // entra con un fade-up cada vez que se cambia de tab, sin remontar los hijos
  // (preserva su estado interno). Silencioso bajo reduced-motion.
  const contentRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion() || !contentRef.current) return;
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 24, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DURATION.slow,
          ease: EASE.outQuint,
          clearProps: "transform",
        }
      );
    },
    { dependencies: [activeTab, equipoSubTab] }
  );

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

  // Técnico seleccionado para el sheet de equipos + sus teléfonos filtrados.
  const equipoTecData = useMemo(
    () =>
      equipoDetalle
        ? teamData.find((t) => t.nombre === equipoDetalle) ?? null
        : null,
    [equipoDetalle, teamData]
  );
  const equipoPhonesFiltradas = useMemo(() => {
    const lista = equipoTecData?.phones ?? [];
    const q = equipoBusqueda.toLowerCase().trim();
    if (!q) return lista;
    return lista.filter(
      (p) =>
        p.imei?.toLowerCase().includes(q) ||
        p.nombre?.toLowerCase().includes(q) ||
        p.color?.toLowerCase().includes(q)
    );
  }, [equipoTecData, equipoBusqueda]);

  // Técnico seleccionado para el sheet de clientes + sus reparaciones filtradas.
  const equipoCliData = useMemo(
    () =>
      equipoCliDetalle
        ? teamClientesData.find((t) => t.tecnico === equipoCliDetalle) ?? null
        : null,
    [equipoCliDetalle, teamClientesData]
  );
  const equipoCliFiltradas = useMemo(() => {
    const lista = equipoCliData?.reparaciones ?? [];
    const q = equipoCliBusqueda.toLowerCase().trim();
    if (!q) return lista;
    return lista.filter(
      (r) =>
        `${r.cliente_nombre} ${r.cliente_apellido}`.toLowerCase().includes(q) ||
        r.nombre?.toLowerCase().includes(q) ||
        r.imei?.toLowerCase().includes(q) ||
        r.tipo_reparacion?.toLowerCase().includes(q)
    );
  }, [equipoCliData, equipoCliBusqueda]);

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

  // Si hay transferencias en vuelo (teléfonos o reparaciones), avisar antes de
  // cerrar/recargar la pestaña: un fetch en background se cancela al cerrar y la
  // transferencia se perdería silenciosamente. Cubre ambas colas.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const pending =
        transferWorkingRef.current ||
        transferQueueRef.current.length > 0 ||
        reparacionWorkingRef.current ||
        reparacionQueueRef.current.length > 0;
      if (pending) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Reparaciones auto-fetch when tab is active (handled by useReparaciones hook)

  // Load team data: fast from resumen, then update counts in background
  const loadTeamData = useCallback(async () => {
    setTeamLoading(true);
    let initialData: TecnicoWithPhones[] = [];
    try {
      initialData = await fetchAllTecnicosWithPhones();
      setTeamData(initialData);
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
  // Abre el sheet de equipos de un técnico y carga sus teléfonos lazy.
  const openTecnicoDetalle = useCallback(
    async (nombre: string) => {
      setEquipoBusqueda("");
      setEquipoDetalle(nombre);

      const tecnicoData = teamData.find((t) => t.nombre === nombre);
      if ((tecnicoData?.phones?.length || 0) > 0) return;

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
    },
    [teamData]
  );

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

  // Drena la cola de reparaciones en background, en paralelo (mismo tope de
  // concurrencia que los teléfonos). Si una falla, hace rollback real: la
  // reparación vuelve a la lista (restoreReparacionesToCache la saca del ghost
  // filter y la re-mete). Al vaciar, reconcilia con Monday; las OK siguen
  // ocultas por el ghost filter (120s), las fallidas ya reaparecieron.
  const REPARACION_CONCURRENCY = 4;
  const drainReparacionQueue = useCallback(async () => {
    if (reparacionWorkingRef.current) return;
    reparacionWorkingRef.current = true;
    try {
      while (true) {
        while (reparacionQueueRef.current.length > 0) {
          const batch = reparacionQueueRef.current.splice(0, REPARACION_CONCURRENCY);
          await Promise.all(
            batch.map(async ({ payload, reparacion }) => {
              // request_id estable entre reintentos → la red es idempotente
              // (Monday y el log con ignore-duplicates no duplican).
              const requestId = generateRequestId();
              const MAX_ATTEMPTS = 3; // 1 intento + 2 reintentos
              let ok = false;
              let lastError = "Error al transferir";
              try {
                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                  const response = await transferirReparacion({
                    item_id: payload.item_id,
                    tecnico_actual: payload.tecnico_actual,
                    tecnico_actual_nombre: payload.tecnico_actual_nombre,
                    item_nombre: reparacion.nombre,
                    nuevo_tecnico: payload.nuevo_tecnico,
                    comentario: payload.comentario,
                    foto: payload.foto,
                    request_id: requestId,
                  });
                  if (response.success) {
                    ok = true;
                    break;
                  }
                  lastError = response.error || lastError;
                  // Backoff antes de reintentar (600ms, 1200ms). Evita declarar
                  // fallo por una microcaída de red transitoria.
                  if (attempt < MAX_ATTEMPTS) {
                    await new Promise((r) => setTimeout(r, attempt * 600));
                  }
                }
                if (ok) {
                  reparacionStatsRef.current.ok++;
                } else {
                  reparacionStatsRef.current.fail++;
                  if (!reparacionStatsRef.current.firstError) reparacionStatsRef.current.firstError = lastError;
                  // Rollback: la reparación vuelve a la lista (seguía asignada al técnico).
                  restoreReparacionesToCache([reparacion]);
                  console.error("[reparacion-queue] failed", payload.item_id, lastError);
                }
              } finally {
                reparacionStatsRef.current.done++;
                setTransferJob({
                  total: reparacionStatsRef.current.total,
                  done: reparacionStatsRef.current.done,
                  fail: reparacionStatsRef.current.fail,
                });
              }
            })
          );
        }
        // Cola vacía: reconciliar con Monday. Si llegó algo durante el fetch, seguimos.
        await forceRefreshReparaciones().catch(() => {});
        if (reparacionQueueRef.current.length > 0) continue;
        break;
      }

      // Resumen del lote.
      const { ok, fail, firstError } = reparacionStatsRef.current;
      if (fail === 0) {
        toast.success(
          ok === 1 ? "Reparación transferida correctamente" : `${ok} reparaciones transferidas correctamente`
        );
      } else if (ok > 0) {
        toast.warning(`${ok} exitosas, ${fail} fallidas`);
      } else {
        toast.error(firstError || "Error al transferir");
      }

      // Dejar el estado final visible un momento y ocultar el indicador.
      if (reparacionHideTimerRef.current) clearTimeout(reparacionHideTimerRef.current);
      reparacionHideTimerRef.current = setTimeout(() => {
        setTransferJob(null);
        reparacionStatsRef.current = { total: 0, done: 0, ok: 0, fail: 0, firstError: "" };
        reparacionHideTimerRef.current = null;
      }, 2500);
    } finally {
      reparacionWorkingRef.current = false;
    }
  }, [forceRefreshReparaciones, restoreReparacionesToCache]);

  // Encola un lote de reparaciones: las oculta al instante (ghost filter + cache)
  // y arranca/continúa el worker en background.
  const enqueueReparacionTransfers = useCallback(
    (items: { payload: TransferPayload; reparacion: ReparacionCliente }[]) => {
      if (items.length === 0) return;

      if (!reparacionWorkingRef.current && reparacionQueueRef.current.length === 0) {
        if (reparacionHideTimerRef.current) {
          clearTimeout(reparacionHideTimerRef.current);
          reparacionHideTimerRef.current = null;
        }
        reparacionStatsRef.current = { total: 0, done: 0, ok: 0, fail: 0, firstError: "" };
      }

      // Desaparecen YA de la lista, sin esperar la red.
      removeReparacionesFromCache(items.map((i) => i.payload.item_id));

      reparacionStatsRef.current.total += items.length;
      reparacionQueueRef.current.push(...items);
      setTransferJob({
        total: reparacionStatsRef.current.total,
        done: reparacionStatsRef.current.done,
        fail: reparacionStatsRef.current.fail,
      });
      void drainReparacionQueue();
    },
    [removeReparacionesFromCache, drainReparacionQueue]
  );

  const handleTransferReparacionConfirm = useCallback(
    async (payload: TransferPayload) => {
      if (!selectedReparacion) return;
      const reparacion = selectedReparacion;
      handleReparacionModalClose();
      enqueueReparacionTransfers([{ payload, reparacion }]);
    },
    [selectedReparacion, handleReparacionModalClose, enqueueReparacionTransfers]
  );

  // Get estado badge color
  const getEstadoBadge = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes("reparado")) {
      return <Badge className="border-transparent bg-primary/15 text-primary ring-1 ring-inset ring-primary/25">{estado}</Badge>;
    }
    if (estadoLower.includes("pendiente") || estadoLower.includes("espera")) {
      return <Badge className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">{estado}</Badge>;
    }
    if (estadoLower.includes("proceso") || estadoLower.includes("reparando")) {
      return <Badge className="border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/25">{estado}</Badge>;
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
        <SegmentedTabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          options={[
            { value: "telefonos", label: "Teléfonos" },
            { value: "clientes", label: "Clientes" },
            ...(tecnico?.puede_ver_equipo
              ? [{ value: "equipo", label: "Equipo" }]
              : []),
            { value: "historial", label: "Historial" },
          ]}
        />
      </div>

      <main ref={contentRef} className="container mx-auto px-4 py-6">
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
            <SegmentedTabs
              size="sm"
              value={equipoSubTab}
              onValueChange={(v) => setEquipoSubTab(v as typeof equipoSubTab)}
              options={[
                { value: "telefonos", label: "Teléfonos" },
                { value: "clientes", label: "Clientes" },
              ]}
            />

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
                  <div className="space-y-3">
                    {teamData.map((tec, i) => {
                      const count = tec.phonesCount ?? tec.phones.length;
                      return (
                        <Reveal key={tec.nombre} y={18} delay={Math.min(i * 0.04, 0.32)}>
                          <button
                            type="button"
                            onClick={() => openTecnicoDetalle(tec.nombre)}
                            className="group block w-full text-left"
                          >
                            <Card className="sheen card-hover pressable-sm">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-inset ring-border flex items-center justify-center shrink-0">
                                  <UserCircle className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground truncate">{tec.nombre}</h3>
                                  <p className="text-sm text-muted-foreground tabular-nums">
                                    {count} teléfono{count !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/50 transition-transform duration-base ease-out-quint group-hover:translate-x-0.5" />
                              </CardContent>
                            </Card>
                          </button>
                        </Reveal>
                      );
                    })}
                  </div>
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
                  <div className="space-y-3">
                    {teamClientesData.map((item, i) => (
                      <Reveal key={item.tecnico} y={18} delay={Math.min(i * 0.04, 0.32)}>
                        <button
                          type="button"
                          onClick={() => {
                            setEquipoCliBusqueda("");
                            setEquipoCliDetalle(item.tecnico);
                          }}
                          className="group block w-full text-left"
                        >
                          <Card className="sheen card-hover pressable-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-inset ring-border flex items-center justify-center shrink-0">
                                <UserCircle className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{item.tecnico}</h3>
                                <p className="text-sm text-muted-foreground tabular-nums">
                                  {item.reparaciones.length} reparación{item.reparaciones.length !== 1 ? "es" : ""}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/50 transition-transform duration-base ease-out-quint group-hover:translate-x-0.5" />
                            </CardContent>
                          </Card>
                        </button>
                      </Reveal>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === "historial" ? (
          <HistorialTab />
        ) : null}
      </main>

      {transferJob && <TransferProgress job={transferJob} />}

      {/* Sheet de equipos de un técnico, con buscador por IMEI (solo lectura) */}
      <DetailSheet
        open={!!equipoDetalle}
        onOpenChange={(o) => !o && setEquipoDetalle(null)}
        title={equipoDetalle ?? "Equipos"}
        description={
          equipoTecData
            ? `${equipoTecData.phonesCount ?? equipoTecData.phones.length} equipo${
                (equipoTecData.phonesCount ?? equipoTecData.phones.length) !== 1 ? "s" : ""
              }`
            : undefined
        }
      >
        <div className="space-y-4 pb-2">
          {/* Buscador por IMEI / modelo, fijo arriba al hacer scroll */}
          <div className="sticky top-0 z-10 -mt-1 bg-popover pt-1 pb-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                inputMode="search"
                value={equipoBusqueda}
                onChange={(e) => setEquipoBusqueda(e.target.value)}
                placeholder="Buscar por IMEI o modelo…"
                className="w-full bg-card/70 border border-border rounded-2xl py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground shadow-e1 outline-none transition-[border-color,box-shadow] duration-base ease-out-quint hover:border-muted-foreground/40 focus:border-primary/70 focus:ring-2 focus:ring-ring/25"
              />
              {equipoBusqueda && (
                <button
                  onClick={() => setEquipoBusqueda("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors duration-fast"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de equipos */}
          {equipoDetalle && loadingTeamPhones.has(equipoDetalle) ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full bg-secondary" />
              ))}
            </div>
          ) : (equipoTecData?.phones.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin teléfonos asignados
            </p>
          ) : equipoPhonesFiltradas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin resultados para “{equipoBusqueda.trim()}”
            </p>
          ) : (
            <div className="grid gap-3">
              {equipoPhonesFiltradas.map((phone) => (
                <PhoneCard key={phone.id} phone={phone} showTransferButton={false} />
              ))}
            </div>
          )}
        </div>
      </DetailSheet>

      {/* Sheet de reparaciones de clientes de un técnico, con buscador */}
      <DetailSheet
        open={!!equipoCliDetalle}
        onOpenChange={(o) => !o && setEquipoCliDetalle(null)}
        title={equipoCliDetalle ?? "Clientes"}
        description={
          equipoCliData
            ? `${equipoCliData.reparaciones.length} reparación${
                equipoCliData.reparaciones.length !== 1 ? "es" : ""
              }`
            : undefined
        }
      >
        <div className="space-y-4 pb-2">
          {/* Buscador por cliente, IMEI o tipo, fijo arriba */}
          <div className="sticky top-0 z-10 -mt-1 bg-popover pt-1 pb-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                inputMode="search"
                value={equipoCliBusqueda}
                onChange={(e) => setEquipoCliBusqueda(e.target.value)}
                placeholder="Buscar por cliente, IMEI o tipo…"
                className="w-full bg-card/70 border border-border rounded-2xl py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground shadow-e1 outline-none transition-[border-color,box-shadow] duration-base ease-out-quint hover:border-muted-foreground/40 focus:border-primary/70 focus:ring-2 focus:ring-ring/25"
              />
              {equipoCliBusqueda && (
                <button
                  onClick={() => setEquipoCliBusqueda("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors duration-fast"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de reparaciones */}
          {equipoCliFiltradas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {equipoCliBusqueda.trim()
                ? `Sin resultados para “${equipoCliBusqueda.trim()}”`
                : "Sin reparaciones"}
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-inset ring-border">
              {equipoCliFiltradas.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setRepDetalle(rep)}
                  className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-fast ease-out-quint hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {rep.cliente_nombre} {rep.cliente_apellido}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/70">{rep.nombre}</p>
                    <p className="mt-0.5 font-mono tabular-nums text-xs text-muted-foreground">
                      {rep.tipo_reparacion} • ...{rep.imei?.slice(-8) || "Sin IMEI"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {getEstadoBadge(rep.estado)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform duration-base ease-out-quint group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DetailSheet>

      {/* Bottom-sheet de detalle de reparación (vista del equipo, solo lectura) */}
      <DetailSheet
        open={!!repDetalle}
        onOpenChange={(o) => !o && setRepDetalle(null)}
        title={repDetalle ? `${repDetalle.cliente_nombre} ${repDetalle.cliente_apellido}` : "Reparación"}
        description={repDetalle?.cliente_telefono || undefined}
      >
        {repDetalle && (
          <div className="space-y-4 pb-2">
            {/* Equipo + estado */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/50 p-4 ring-1 ring-inset ring-border">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-xl bg-secondary p-2.5 ring-1 ring-inset ring-border">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{repDetalle.nombre}</p>
                  <p className="text-xs text-muted-foreground">Equipo</p>
                </div>
              </div>
              {getEstadoBadge(repDetalle.estado)}
            </div>

            {/* Campos */}
            <dl className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-inset ring-border">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wrench className="h-4 w-4 text-muted-foreground/70" /> Tipo
                </dt>
                <dd className="text-right text-sm text-foreground">{repDetalle.tipo_reparacion}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">IMEI</dt>
                <dd className="font-mono tabular-nums text-sm text-foreground">{repDetalle.imei || "Sin IMEI"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground/70" /> Cliente
                </dt>
                <dd className="tabular-nums text-sm text-foreground">{repDetalle.cliente_telefono}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Fecha</dt>
                <dd className="tabular-nums text-sm text-foreground">{repDetalle.fecha}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Valor</dt>
                <dd className="tabular-nums text-base font-semibold text-foreground">
                  ${repDetalle.valor.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </DetailSheet>

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

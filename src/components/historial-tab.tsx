"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { verticalFade } from "@/lib/auto-animate";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { Lightbox } from "@/components/ui/lightbox";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { ArrowUpRight, ArrowDownLeft, Camera, Smartphone, Wrench, Search, X, ChevronRight } from "lucide-react";

type Filtro = "todos" | "enviados" | "recibidos";
type Contenido = "todos" | "foto" | "comentario";

const CONTENIDOS: { key: Contenido; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "foto", label: "Con foto" },
  { key: "comentario", label: "Con comentario" },
];

interface Movimiento {
  id: string;
  item_id: string;
  equipo: string;
  imei: string | null;
  specs: string | null;
  tipo: "telefono" | "reparacion" | "desconocido";
  de: string;
  para: string;
  direccion: "enviado" | "recibido";
  comentario: string | null;
  tiene_foto: boolean;
  foto_url: string | null;
  fecha: string;
}

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "enviados", label: "Enviados" },
  { key: "recibidos", label: "Recibidos" },
];

interface HistorialTabProps {
  // Si el técnico logueado puede ver el equipo (o es jefe), puede ver también
  // el historial de otros técnicos vía un selector arriba de la lista.
  puedeVerOtros?: boolean;
  miNombre?: string;
}

export function HistorialTab({ puedeVerOtros = false, miNombre }: HistorialTabProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Filtro por contenido (foto / comentario). Se aplica client-side sobre lo ya
  // cargado, así es instantáneo y se combina con enviados/recibidos.
  const [contenido, setContenido] = useState<Contenido>("todos");
  const [busqueda, setBusqueda] = useState("");
  // Técnico cuyo historial se está viendo. null = el mío (sesión).
  const [tecnicoSel, setTecnicoSel] = useState<string | null>(null);
  // Lista de técnicos para el selector (solo si puedeVerOtros).
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Movimiento seleccionado para el bottom-sheet de detalle (presentación).
  const [detalle, setDetalle] = useState<Movimiento | null>(null);
  // Foto abierta en el visor a pantalla completa (lightbox nativo).
  const [fotoZoom, setFotoZoom] = useState<{ src: string; alt: string } | null>(null);
  // Anima entradas/salidas/reordenamientos de la lista al filtrar o buscar.
  // verticalFade: solo translateY + opacity, SIN scale, para que no haya
  // corrimiento horizontal al cargar/filtrar.
  const [listRef] = useAutoAnimate<HTMLDivElement>(verticalFade);

  const cargar = useCallback(async (f: Filtro, q: string, tec: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filtro: f });
      if (q.trim()) params.set("q", q.trim());
      if (tec) params.set("tecnico", tec);
      const res = await fetch(`/api/live/historial?${params.toString()}`, {
        credentials: "include",
        headers: { "X-Requested-With": "mrapple" },
      });
      if (res.status === 401) {
        setError("Sesión expirada");
        setMovimientos([]);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMovimientos(data.data as Movimiento[]);
      } else {
        setError(data.error || "No se pudo cargar el historial");
        setMovimientos([]);
      }
    } catch {
      setError("Error de conexión");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce de la búsqueda para no pegarle al endpoint en cada tecla.
    const t = setTimeout(() => cargar(filtro, busqueda, tecnicoSel), busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [filtro, busqueda, tecnicoSel, cargar]);

  // Cargar la lista de técnicos para el selector (mismo gate de permiso que el
  // endpoint de equipo). Solo se trae una vez si el usuario puede ver otros.
  useEffect(() => {
    if (!puedeVerOtros) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/live/equipo-resumen", {
          credentials: "include",
          headers: { "X-Requested-With": "mrapple" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelado || !Array.isArray(data)) return;
        const nombres = (data as { tecnico?: string }[])
          .map((r) => (r.tecnico || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es"));
        setTecnicos(nombres);
      } catch {
        // Silencioso: si falla, simplemente no se muestra el selector de otros.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [puedeVerOtros]);

  // Técnicos del selector, excluyéndome a mí (el chip "Yo" me representa).
  const otrosTecnicos = useMemo(
    () =>
      tecnicos.filter(
        (t) => !miNombre || t.toLowerCase() !== miNombre.toLowerCase()
      ),
    [tecnicos, miNombre]
  );
  const mostrarSelector = puedeVerOtros && otrosTecnicos.length > 0;

  // Filtrado por contenido (client-side, instantáneo).
  const movimientosFiltrados = useMemo(() => {
    if (contenido === "foto") return movimientos.filter((m) => m.tiene_foto);
    if (contenido === "comentario") return movimientos.filter((m) => !!m.comentario?.trim());
    return movimientos;
  }, [movimientos, contenido]);

  return (
    <div className="space-y-4">
      {/* Selector de técnico: solo para quien puede ver el equipo. "Yo" = sesión. */}
      {mostrarSelector && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTecnicoSel(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-fast ${
              tecnicoSel === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Yo
          </button>
          {otrosTecnicos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTecnicoSel(t)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-fast ${
                tecnicoSel === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Búsqueda por IMEI o modelo */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          inputMode="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por IMEI o modelo…"
          className="w-full bg-card/70 border border-border rounded-2xl py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground shadow-e1 outline-none transition-[border-color,box-shadow] duration-base ease-out-quint hover:border-muted-foreground/40 focus:border-primary/70 focus:ring-2 focus:ring-ring/25"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors duration-fast"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros por dirección */}
      <SegmentedTabs
        size="sm"
        value={filtro}
        onValueChange={(v) => setFiltro(v as Filtro)}
        options={FILTROS.map((f) => ({ value: f.key, label: f.label }))}
      />

      {/* Filtros por contenido (foto / comentario) */}
      <SegmentedTabs
        size="sm"
        value={contenido}
        onValueChange={(v) => setContenido(v as Contenido)}
        options={CONTENIDOS.map((c) => ({ value: c.key, label: c.label }))}
      />

      <div ref={listRef} className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">{error}</div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {busqueda.trim()
              ? `Sin resultados para “${busqueda.trim()}”`
              : contenido === "foto"
              ? "No hay movimientos con foto"
              : contenido === "comentario"
              ? "No hay movimientos con comentario"
              : filtro === "enviados"
              ? tecnicoSel
                ? `${tecnicoSel} no ha enviado equipos`
                : "No has enviado equipos todavía"
              : filtro === "recibidos"
              ? tecnicoSel
                ? `${tecnicoSel} no ha recibido equipos`
                : "No has recibido equipos todavía"
              : tecnicoSel
              ? `Sin movimientos de ${tecnicoSel}`
              : "Sin movimientos registrados"}
          </div>
        ) : (
          movimientosFiltrados.map((m) => {
            const enviado = m.direccion === "enviado";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setDetalle(m)}
                className="group block w-full text-left"
              >
                <Card className="sheen card-hover pressable-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-2 ring-1 ${
                          enviado ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/25" : "bg-primary/15 text-primary ring-primary/25"
                        }`}
                      >
                        {enviado ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {m.tipo === "reparacion" ? (
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <p className="font-semibold text-foreground truncate">{m.equipo}</p>
                        </div>
                        {m.imei && (
                          <p className="text-xs font-mono tabular-nums text-muted-foreground mt-0.5 truncate">
                            IMEI {m.imei}
                          </p>
                        )}
                        {m.specs && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{m.specs}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {enviado ? (
                            <>
                              Enviado a <span className="text-foreground font-medium">{m.para}</span>
                            </>
                          ) : (
                            <>
                              Recibido de <span className="text-foreground font-medium">{m.de}</span>
                            </>
                          )}
                        </p>
                        {m.comentario && (
                          <p className="text-sm text-secondary-foreground mt-1 line-clamp-1">“{m.comentario}”</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{formatFecha(m.fecha)}</span>
                          {m.tiene_foto && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                              <Camera className="h-3.5 w-3.5" /> Foto
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/50 transition-transform duration-base ease-out-quint group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom-sheet de detalle del movimiento */}
      <DetailSheet
        open={!!detalle}
        onOpenChange={(o) => !o && setDetalle(null)}
        title={detalle?.equipo ?? "Movimiento"}
        description={detalle ? formatFecha(detalle.fecha) : undefined}
      >
        {detalle && (
          <div className="space-y-4 pb-2">
            {/* Foto grande — abre el visor nativo a pantalla completa. */}
            {detalle.tiene_foto && detalle.foto_url && (
              <button
                type="button"
                onClick={() =>
                  setFotoZoom({
                    src: detalle.foto_url!,
                    alt: `Evidencia de ${detalle.equipo}`,
                  })
                }
                aria-label="Ver foto en pantalla completa"
                className="pressable group block w-full overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-inset ring-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detalle.foto_url}
                  alt={`Evidencia de ${detalle.equipo}`}
                  className="aspect-[4/3] w-full object-contain transition-transform duration-slow ease-out-quint group-hover:scale-[1.02]"
                />
              </button>
            )}

            {/* Dirección */}
            <div
              className={`flex items-center gap-3 rounded-2xl p-3.5 ring-1 ring-inset ${
                detalle.direccion === "enviado"
                  ? "bg-amber-500/[0.08] ring-amber-500/20"
                  : "bg-primary/[0.06] ring-primary/20"
              }`}
            >
              <div
                className={`rounded-full p-2 ${
                  detalle.direccion === "enviado" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/15 text-primary"
                }`}
              >
                {detalle.direccion === "enviado" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4" />
                )}
              </div>
              <p className="text-sm text-foreground">
                {detalle.direccion === "enviado" ? (
                  <>Enviado a <span className="font-semibold">{detalle.para}</span></>
                ) : (
                  <>Recibido de <span className="font-semibold">{detalle.de}</span></>
                )}
              </p>
            </div>

            {/* Campos */}
            <dl className="divide-y divide-border overflow-hidden rounded-2xl ring-1 ring-inset ring-border">
              {detalle.imei && (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">IMEI</dt>
                  <dd className="font-mono tabular-nums text-sm text-foreground">{detalle.imei}</dd>
                </div>
              )}
              {detalle.specs && (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-muted-foreground">Specs</dt>
                  <dd className="text-right text-sm text-foreground">{detalle.specs}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Tipo</dt>
                <dd className="text-sm capitalize text-foreground">{detalle.tipo}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Fecha</dt>
                <dd className="tabular-nums text-sm text-foreground">{formatFecha(detalle.fecha)}</dd>
              </div>
            </dl>

            {/* Comentario */}
            {detalle.comentario && (
              <div className="rounded-2xl bg-secondary/50 p-4 ring-1 ring-inset ring-border">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Comentario</p>
                <p className="text-sm leading-relaxed text-secondary-foreground break-words">“{detalle.comentario}”</p>
              </div>
            )}
          </div>
        )}
      </DetailSheet>

      {/* Visor de foto a pantalla completa (nativo, sin salir de la app). */}
      <Lightbox
        open={!!fotoZoom}
        onOpenChange={(o) => !o && setFotoZoom(null)}
        src={fotoZoom?.src ?? null}
        alt={fotoZoom?.alt}
      />
    </div>
  );
}

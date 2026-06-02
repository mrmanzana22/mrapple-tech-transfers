"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, Camera, Smartphone, Wrench, Search, X } from "lucide-react";

type Filtro = "todos" | "enviados" | "recibidos";

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

export function HistorialTab() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (f: Filtro, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filtro: f });
      if (q.trim()) params.set("q", q.trim());
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
    const t = setTimeout(() => cargar(filtro, busqueda), busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [filtro, busqueda, cargar]);

  return (
    <div className="space-y-4">
      {/* Búsqueda por IMEI o modelo */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          inputMode="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por IMEI o modelo…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 pl-9 pr-9 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-all ${
              filtro === f.key ? "bg-zinc-700 text-white" : "text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-zinc-500">{error}</div>
      ) : movimientos.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {busqueda.trim()
            ? `Sin resultados para “${busqueda.trim()}”`
            : filtro === "enviados"
            ? "No has enviado equipos todavía"
            : filtro === "recibidos"
            ? "No has recibido equipos todavía"
            : "Sin movimientos registrados"}
        </div>
      ) : (
        movimientos.map((m) => {
          const enviado = m.direccion === "enviado";
          return (
            <Card key={m.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-full p-2 ${
                      enviado ? "bg-orange-500/15 text-orange-400" : "bg-emerald-500/15 text-emerald-400"
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
                        <Wrench className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <Smartphone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      )}
                      <p className="font-semibold text-white truncate">{m.equipo}</p>
                    </div>
                    {m.imei && (
                      <p className="text-xs font-mono text-zinc-400 mt-0.5 truncate">
                        IMEI {m.imei}
                      </p>
                    )}
                    {m.specs && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.specs}</p>
                    )}
                    <p className="text-sm text-zinc-400 mt-1">
                      {enviado ? (
                        <>
                          Enviado a <span className="text-white font-medium">{m.para}</span>
                        </>
                      ) : (
                        <>
                          Recibido de <span className="text-white font-medium">{m.de}</span>
                        </>
                      )}
                    </p>
                    {m.comentario && (
                      <p className="text-sm text-zinc-300 mt-1 break-words">“{m.comentario}”</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span>{formatFecha(m.fecha)}</span>
                      {m.tiene_foto && m.foto_url && (
                        <a
                          href={m.foto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
                        >
                          <Camera className="h-3.5 w-3.5" /> Ver foto
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, Camera, Smartphone, Wrench } from "lucide-react";

type Filtro = "todos" | "enviados" | "recibidos";

interface Movimiento {
  id: string;
  item_id: string;
  equipo: string;
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
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (f: Filtro) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/live/historial?filtro=${f}`, {
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
    cargar(filtro);
  }, [filtro, cargar]);

  return (
    <div className="space-y-4">
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
          {filtro === "enviados"
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

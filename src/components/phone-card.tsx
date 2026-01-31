"use client";

import React from "react";
import {
  Smartphone,
  Battery,
  HardDrive,
  Calendar,
  ArrowRightLeft,
  Hash,
  MessageSquare,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Phone } from "@/types";

// ============================================
// TYPES
// ============================================

interface PhoneCardProps {
  phone: Phone;
  onTransfer?: (phone: Phone) => void;
  index?: number;
  showTransferButton?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (phone: Phone) => void;
}

// ============================================
// HELPERS
// ============================================

const getEstadoConfig = (estado: string) => {
  const config: Record<string, { label: string; className: string }> = {
    Done: {
      label: "Completado",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    Reparacion: {
      label: "En Reparacion",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    Pendiente: {
      label: "Pendiente",
      className: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    },
    Stock: {
      label: "Stock",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
  };
  return config[estado] || config.Pendiente;
};

const getGradoConfig = (grado: string) => {
  const config: Record<string, { label: string; className: string }> = {
    A: { label: "Grado A", className: "bg-emerald-500/10 text-emerald-400" },
    B: { label: "Grado B", className: "bg-amber-500/10 text-amber-400" },
    C: { label: "Grado C", className: "bg-red-500/10 text-red-400" },
  };
  return config[grado] || { label: grado, className: "bg-slate-500/10 text-slate-400" };
};

const getBatteryColor = (percentage: string): string => {
  const num = parseInt(percentage) || 0;
  if (num >= 80) return "text-emerald-400";
  if (num >= 50) return "text-amber-400";
  return "text-red-400";
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
};

// Helper to get stagger delay based on index
const getStaggerDelay = (index: number): string => {
  // Cap at 0.8s to prevent too long delays
  const delay = Math.min(index * 0.1, 0.8);
  return `${delay}s`;
};

// ============================================
// COMPONENT
// ============================================

function PhoneCardComponent({
  phone,
  onTransfer,
  index = 0,
  showTransferButton = true,
  isSelectable = false,
  isSelected = false,
  onSelect,
}: PhoneCardProps) {
  const estadoConfig = getEstadoConfig(phone.estado);
  const gradoConfig = getGradoConfig(phone.grado);

  const handleCardClick = () => {
    if (isSelectable && onSelect) {
      onSelect(phone);
    }
  };

  return (
    <div
      className={`w-full animate-fade-in-up card-hover opacity-0 ${isSelectable ? "cursor-pointer" : ""}`}
      style={{ animationDelay: getStaggerDelay(index), animationFillMode: "forwards" }}
      onClick={isSelectable ? handleCardClick : undefined}
    >
      <Card className={`relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 ${isSelected ? "ring-2 ring-blue-500 border-blue-500/50" : ""}`}>
        {/* Gradient accent line */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${isSelected ? "bg-blue-500" : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"}`} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Phone name and model */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Selection checkbox */}
              {isSelectable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(phone);
                  }}
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </button>
              )}
              <div className="flex-shrink-0 p-2 rounded-lg bg-slate-800/80">
                <Smartphone className="h-5 w-5 text-slate-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-100 truncate text-base">
                  {phone.nombre}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{phone.color}</p>
              </div>
            </div>

            {/* Status badge and comments indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {phone.tiene_comentarios && (
                <div className="p-1.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                </div>
              )}
              <Badge
                variant="outline"
                className={`text-xs font-medium ${estadoConfig.className}`}
              >
                {estadoConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* IMEI */}
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-400 truncate font-mono text-xs">
                {phone.imei?.slice(-8) || "N/A"}
              </span>
            </div>

            {/* Capacity */}
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-300">{phone.gb || "N/A"} GB</span>
            </div>

            {/* Battery */}
            <div className="flex items-center gap-2 text-sm">
              <Battery
                className={`h-4 w-4 flex-shrink-0 ${getBatteryColor(phone.estado_bateria)}`}
              />
              <span className={getBatteryColor(phone.estado_bateria)}>
                {phone.estado_bateria || "N/A"}%
              </span>
            </div>

            {/* Delivery date */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-400">
                {formatDate(phone.fecha_entrega)}
              </span>
            </div>
          </div>

          {/* Review - Solo mostrar si tiene contenido */}
          {phone.review && (
            <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  {phone.review}
                </p>
              </div>
            </div>
          )}

          {/* Grade badge */}
          <div className="mt-3">
            <Badge variant="secondary" className={`text-xs ${gradoConfig.className}`}>
              {gradoConfig.label}
            </Badge>
          </div>
        </CardContent>

        {showTransferButton && onTransfer && (
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(phone)}
              className="w-full border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir o Adjuntar Evidencia
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

// Memoize with custom comparator that ignores index changes
export const PhoneCard = React.memo(PhoneCardComponent, (prevProps, nextProps) => {
  // Re-render only if phone data or handlers change, ignore index
  return (
    prevProps.phone.id === nextProps.phone.id &&
    prevProps.phone.estado === nextProps.phone.estado &&
    prevProps.phone.tecnico === nextProps.phone.tecnico &&
    prevProps.phone.tiene_comentarios === nextProps.phone.tiene_comentarios &&
    prevProps.phone.review === nextProps.phone.review &&
    prevProps.onTransfer === nextProps.onTransfer &&
    prevProps.isSelectable === nextProps.isSelectable &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect
  );
});

PhoneCard.displayName = "PhoneCard";

// ============================================
// SKELETON LOADER
// ============================================

export function PhoneCardSkeleton() {
  return (
    <Card className="border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-800 animate-pulse" />
            <div>
              <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-800 rounded animate-pulse mt-1.5" />
            </div>
          </div>
          <div className="h-5 w-20 bg-slate-800 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-5 w-16 bg-slate-800 rounded-full animate-pulse mt-4" />
      </CardContent>
      <CardFooter className="pt-0">
        <div className="h-9 w-full bg-slate-800 rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}

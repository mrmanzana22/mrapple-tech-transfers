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
  disableAnimation?: boolean;
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
      className: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/25",
    },
    Reparacion: {
      label: "En Reparacion",
      className: "bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/25",
    },
    Pendiente: {
      label: "Pendiente",
      className: "bg-secondary text-muted-foreground ring-1 ring-inset ring-border",
    },
    Stock: {
      label: "Stock",
      className: "bg-sky-500/15 text-sky-400 ring-1 ring-inset ring-sky-500/25",
    },
  };
  return config[estado] || config.Pendiente;
};

const getGradoConfig = (grado: string) => {
  const config: Record<string, { label: string; className: string }> = {
    A: { label: "Grado A", className: "bg-primary/10 text-primary" },
    B: { label: "Grado B", className: "bg-amber-500/10 text-amber-400" },
    C: { label: "Grado C", className: "bg-red-500/10 text-red-400" },
  };
  return config[grado] || { label: grado, className: "bg-secondary text-muted-foreground" };
};

const getBatteryColor = (percentage: string): string => {
  const num = parseInt(percentage) || 0;
  if (num >= 80) return "text-primary";
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
  disableAnimation = false,
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
      className={`w-full card-hover ${disableAnimation ? "" : "animate-fade-in-up opacity-0"} ${isSelectable ? "cursor-pointer" : ""}`}
      style={disableAnimation ? undefined : { animationDelay: getStaggerDelay(index), animationFillMode: "forwards" }}
      onClick={isSelectable ? handleCardClick : undefined}
    >
      <Card className={`group relative overflow-hidden sheen ${isSelected ? "ring-2 ring-primary/70 border-primary/40 shadow-e2" : ""}`}>
        {/* Accent rail — quiet by default, primary when selected */}
        <div className={`absolute top-0 left-0 right-0 h-px transition-colors duration-base ease-out-quint ${isSelected ? "bg-primary" : "bg-border group-hover:bg-border/80"}`} />

        <CardHeader className="p-5 pb-3.5">
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
                  className={`pressable flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-[background-color,border-color] duration-fast ease-out-quint ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-input hover:border-muted-foreground/60"
                  }`}
                  aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                >
                  {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                </button>
              )}
              <div className="flex-shrink-0 p-2.5 rounded-xl bg-secondary ring-1 ring-inset ring-border">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate text-[15px] leading-tight">
                  {phone.nombre}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{phone.color}</p>
              </div>
            </div>

            {/* Status badge and comments indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {phone.tiene_comentarios && (
                <div className="p-1.5 rounded-md bg-sky-500/15 ring-1 ring-inset ring-sky-500/25">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                </div>
              )}
              <Badge
                variant="outline"
                className={`text-xs font-medium border-transparent ${estadoConfig.className}`}
              >
                {estadoConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pt-0 pb-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-background/40 ring-1 ring-inset ring-border/60 p-3.5">
            {/* IMEI */}
            <div className="flex items-center gap-2.5 text-sm min-w-0">
              <Hash className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-muted-foreground truncate font-mono text-xs tabular-nums">
                {phone.imei?.slice(-8) || "N/A"}
              </span>
            </div>

            {/* Capacity */}
            <div className="flex items-center gap-2.5 text-sm">
              <HardDrive className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-foreground/80 tabular-nums">{phone.gb || "N/A"} GB</span>
            </div>

            {/* Battery */}
            <div className="flex items-center gap-2.5 text-sm">
              <Battery
                className={`h-4 w-4 flex-shrink-0 ${getBatteryColor(phone.estado_bateria)}`}
              />
              <span className={`tabular-nums ${getBatteryColor(phone.estado_bateria)}`}>
                {phone.estado_bateria || "N/A"}%
              </span>
            </div>

            {/* Delivery date */}
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-muted-foreground">
                {formatDate(phone.fecha_entrega)}
              </span>
            </div>
          </div>

          {/* Review - Solo mostrar si tiene contenido */}
          {phone.review && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/[0.08] ring-1 ring-inset ring-amber-500/20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {phone.review}
                </p>
              </div>
            </div>
          )}

          {/* Grade badge */}
          <div className="mt-3.5">
            <Badge variant="secondary" className={`text-xs border-transparent ${gradoConfig.className}`}>
              {gradoConfig.label}
            </Badge>
          </div>
        </CardContent>

        {showTransferButton && onTransfer && (
          <CardFooter className="px-5 pt-0 pb-5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(phone)}
              className="w-full"
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
    <Card className="skeleton-shimmer overflow-hidden">
      <CardHeader className="p-5 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary" />
            <div>
              <div className="h-4 w-32 bg-secondary rounded" />
              <div className="h-3 w-16 bg-secondary rounded mt-2" />
            </div>
          </div>
          <div className="h-5 w-20 bg-secondary rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pt-0 pb-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-background/40 ring-1 ring-inset ring-border/60 p-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-secondary rounded" />
          ))}
        </div>
        <div className="h-5 w-16 bg-secondary rounded-md mt-3.5" />
      </CardContent>
      <CardFooter className="px-5 pt-0 pb-5">
        <div className="h-8 w-full bg-secondary rounded-md" />
      </CardFooter>
    </Card>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  Smartphone,
  Battery,
  HardDrive,
  Calendar,
  ArrowRightLeft,
  Hash,
  MessageSquare,
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
  onTransfer: (phone: Phone) => void;
  index?: number;
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

// ============================================
// ANIMATION VARIANTS
// ============================================

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: index * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

// ============================================
// COMPONENT
// ============================================

export function PhoneCard({ phone, onTransfer, index = 0 }: PhoneCardProps) {
  const estadoConfig = getEstadoConfig(phone.estado);
  const gradoConfig = getGradoConfig(phone.grado);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      className="w-full"
    >
      <Card className="relative overflow-hidden border-slate-800/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-shadow duration-300">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Phone name and model */}
            <div className="flex items-center gap-3 min-w-0">
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

          {/* Grade badge */}
          <div className="mt-4">
            <Badge variant="secondary" className={`text-xs ${gradoConfig.className}`}>
              {gradoConfig.label}
            </Badge>
          </div>
        </CardContent>

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
      </Card>
    </motion.div>
  );
}

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

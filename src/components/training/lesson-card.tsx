"use client";

import { Lock, Play, ClipboardList, CheckCircle2, ChevronRight } from "lucide-react";
import { LessonStatus } from "@/types/training";
import { cn } from "@/lib/utils";

interface LessonCardProps {
  titulo: string;
  descripcion: string;
  orden: number;
  estado: LessonStatus;
  intentos: number;
  nota?: number;
  onClick: () => void;
}

const STATUS_CONFIG: Record<LessonStatus, {
  icon: typeof Lock;
  badgeBg: string;
  badgeText: string;
  label: string;
  accent: string;
}> = {
  bloqueada: {
    icon: Lock,
    badgeBg: 'bg-secondary',
    badgeText: 'text-muted-foreground',
    label: 'Bloqueada',
    accent: 'text-muted-foreground',
  },
  video_pendiente: {
    icon: Play,
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    label: 'Ver Video',
    accent: 'text-sky-400',
  },
  quiz_pendiente: {
    icon: ClipboardList,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    label: 'Quiz Pendiente',
    accent: 'text-amber-400',
  },
  completada: {
    icon: CheckCircle2,
    badgeBg: 'bg-primary/12',
    badgeText: 'text-primary',
    label: 'Completada',
    accent: 'text-primary',
  },
};

export function LessonCard({ titulo, orden, estado, intentos, nota, onClick }: LessonCardProps) {
  const config = STATUS_CONFIG[estado];
  const isClickable = estado !== 'bloqueada';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "group w-full text-left rounded-2xl border p-4 sm:p-5",
        isClickable
          ? "surface card-hover pressable shadow-e1 cursor-pointer"
          : "border-border/60 bg-card/40 opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Lesson number / status medallion */}
        <div className={cn(
          "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ring-1",
          estado === 'completada' ? 'bg-primary/12 ring-primary/25' :
          estado === 'bloqueada' ? 'bg-secondary ring-border' :
          'bg-secondary ring-border'
        )}>
          {estado === 'completada' ? (
            <CheckCircle2 className="w-[22px] h-[22px] text-primary" />
          ) : estado === 'bloqueada' ? (
            <Lock className="w-[18px] h-[18px] text-muted-foreground" />
          ) : (
            <span className="text-lg font-semibold text-foreground tabular-nums">{orden}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "text-[15px] font-semibold tracking-tight truncate",
              estado === 'bloqueada' ? 'text-muted-foreground' : 'text-foreground'
            )}>
              Lección {orden}
            </h3>
            <span className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
              config.badgeBg, config.badgeText
            )}>
              {config.label}
            </span>
          </div>
          <p className={cn(
            "text-sm leading-snug truncate",
            estado === 'bloqueada' ? 'text-muted-foreground/70' : 'text-muted-foreground'
          )}>
            {titulo}
          </p>
          {estado === 'quiz_pendiente' && intentos > 0 && (
            <p className="text-xs text-amber-400/80 mt-1 tabular-nums">
              Intento {intentos}/3 {nota !== undefined && `· Mejor nota: ${nota}/10`}
            </p>
          )}
          {estado === 'completada' && nota !== undefined && (
            <p className="text-xs text-primary/80 mt-1 tabular-nums">
              Aprobado con {nota}/10
            </p>
          )}
        </div>

        {/* Chevron affordance */}
        {isClickable && (
          <ChevronRight className="w-5 h-5 flex-shrink-0 text-muted-foreground/60 transition-transform duration-base ease-out-quint group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>
    </button>
  );
}

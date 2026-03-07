"use client";

import { Lock, Play, ClipboardList, CheckCircle2 } from "lucide-react";
import { LessonStatus } from "@/types/training";

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
  bg: string;
  border: string;
  text: string;
  label: string;
  iconColor: string;
}> = {
  bloqueada: {
    icon: Lock,
    bg: 'bg-zinc-800/30',
    border: 'border-zinc-800/50',
    text: 'text-zinc-600',
    label: 'Bloqueada',
    iconColor: 'text-zinc-600',
  },
  video_pendiente: {
    icon: Play,
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'Ver Video',
    iconColor: 'text-blue-400',
  },
  quiz_pendiente: {
    icon: ClipboardList,
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    label: 'Quiz Pendiente',
    iconColor: 'text-yellow-400',
  },
  completada: {
    icon: CheckCircle2,
    bg: 'bg-green-500/5',
    border: 'border-green-500/30',
    text: 'text-green-400',
    label: 'Completada',
    iconColor: 'text-green-400',
  },
};

export function LessonCard({ titulo, orden, estado, intentos, nota, onClick }: LessonCardProps) {
  const config = STATUS_CONFIG[estado];
  const Icon = config.icon;
  const isClickable = estado !== 'bloqueada';

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`w-full text-left rounded-xl border ${config.border} ${config.bg} p-4 sm:p-5 transition-all ${
        isClickable ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Lesson number + icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
          estado === 'completada' ? 'bg-green-500/20' :
          estado === 'bloqueada' ? 'bg-zinc-800' :
          'bg-zinc-800/80'
        }`}>
          {estado === 'completada' ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : estado === 'bloqueada' ? (
            <Lock className="w-5 h-5 text-zinc-600" />
          ) : (
            <span className="text-lg font-bold text-white">{orden}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold truncate ${estado === 'bloqueada' ? 'text-zinc-600' : 'text-white'}`}>
              Lección {orden}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${config.border} ${config.text} whitespace-nowrap`}>
              {config.label}
            </span>
          </div>
          <p className={`text-sm ${estado === 'bloqueada' ? 'text-zinc-700' : 'text-zinc-400'}`}>
            {titulo}
          </p>
          {estado === 'quiz_pendiente' && intentos > 0 && (
            <p className="text-xs text-yellow-400/70 mt-1">
              Intento {intentos}/3 {nota !== undefined && `· Mejor nota: ${nota}/10`}
            </p>
          )}
          {estado === 'completada' && nota !== undefined && (
            <p className="text-xs text-green-400/70 mt-1">
              Aprobado con {nota}/10
            </p>
          )}
        </div>

        {/* Arrow */}
        {isClickable && (
          <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${config.iconColor}`} />
        )}
      </div>
    </button>
  );
}

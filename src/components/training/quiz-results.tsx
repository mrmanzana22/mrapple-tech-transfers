"use client";

import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizResultResponse } from "@/types/training";

interface QuizResultsProps {
  result: QuizResultResponse;
  onRetry: () => void;
  onNextLesson: () => void;
  onRewatchVideo: () => void;
  onBackToDashboard: () => void;
}

export function QuizResults({ result, onRetry, onNextLesson, onRewatchVideo, onBackToDashboard }: QuizResultsProps) {
  const passed = result.aprobado;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Score */}
      <div className={`text-center py-8 rounded-2xl border ${
        passed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          passed ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {passed ? (
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400" />
          )}
        </div>

        <div className={`text-5xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {result.nota}/{result.total}
        </div>

        <p className={`text-lg font-semibold ${passed ? 'text-green-300' : 'text-red-300'}`}>
          {passed ? '¡Aprobado!' : 'No aprobado'}
        </p>

        <p className="text-sm text-zinc-500 mt-1">
          Intento {result.numero_intento}/3
        </p>
      </div>

      {/* Critical question alert */}
      {result.critica_fallada && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Pregunta Crítica Fallada</p>
            <p className="text-xs text-red-400/70 mt-1">
              En el taller real, este error puede quemar un chip o dañar la placa del cliente.
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      <div className={`p-4 rounded-xl border ${
        passed ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-900 border-zinc-800'
      }`}>
        <p className={`text-sm ${passed ? 'text-green-300' : 'text-zinc-300'}`}>
          {result.mensaje}
        </p>
      </div>

      {/* Failed topics */}
      {!passed && result.temas_fallados.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-yellow-400">Temas a repasar:</p>
          <div className="flex flex-wrap gap-2">
            {result.temas_fallados.map(tema => (
              <span
                key={tema}
                className="px-3 py-1 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400"
              >
                {tema.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Answer review */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-400">Revisión de respuestas:</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {result.respuestas_correctas.map((resp) => (
            <div
              key={resp.question_id}
              className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs"
            >
              <p className="text-zinc-300 mb-1">
                <span className="font-semibold text-green-400">Respuesta correcta: {resp.respuesta_correcta})</span>
              </p>
              <p className="text-zinc-500">{resp.explicacion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {passed ? (
          <>
            {result.siguiente_leccion_desbloqueada && (
              <Button
                onClick={onNextLesson}
                className="w-full py-6 text-base font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Siguiente Lección
              </Button>
            )}
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="w-full py-4 text-zinc-400 hover:text-white"
            >
              Volver al Panel
            </Button>
          </>
        ) : result.debe_rever_video ? (
          <>
            <Button
              onClick={onRewatchVideo}
              className="w-full py-6 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              Volver a Ver el Video
            </Button>
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="w-full py-4 text-zinc-400 hover:text-white"
            >
              Volver al Panel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onRetry}
              className="w-full py-6 text-base font-semibold rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reintentar ({result.intentos_restantes} intento{result.intentos_restantes !== 1 ? 's' : ''} restante{result.intentos_restantes !== 1 ? 's' : ''})
            </Button>
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="w-full py-4 text-zinc-400 hover:text-white"
            >
              Volver al Panel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

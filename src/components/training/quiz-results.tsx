"use client";

import { useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizResultResponse } from "@/types/training";
import { gsap, EASE, DURATION, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface QuizResultsProps {
  result: QuizResultResponse;
  onRetry: () => void;
  onNextLesson: () => void;
  onRewatchVideo: () => void;
  onBackToDashboard: () => void;
}

export function QuizResults({ result, onRetry, onNextLesson, onRewatchVideo, onBackToDashboard }: QuizResultsProps) {
  const passed = result.aprobado;
  const root = useRef<HTMLDivElement>(null);

  // Tasteful celebration on mount: medallion spring-pops, score + meta lift in,
  // remaining sections settle below. Quiet (no transform) under reduced motion.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: EASE.outQuint } });

      // Celebrate only on success: the medallion springs in. On failure the
      // entrance is sober (a quiet fade) — never animate a failure like a win.
      tl.from('[data-result-medallion]', passed
        ? { scale: 0.4, opacity: 0, duration: DURATION.slow, ease: EASE.spring }
        : { opacity: 0, y: 8, duration: DURATION.base })
        .from(
          '[data-result-score] > *',
          { y: 14, opacity: 0, duration: DURATION.base, stagger: 0.06 },
          '-=0.2'
        )
        .from(
          '[data-result-section]',
          { y: 18, opacity: 0, duration: DURATION.base, stagger: 0.07 },
          '-=0.1'
        );
    },
    { scope: root, dependencies: [] }
  );

  return (
    <div ref={root} className="space-y-6">
      {/* Score */}
      <div className={cn(
        "relative overflow-hidden text-center py-10 rounded-3xl border sheen",
        passed
          ? 'bg-primary/[0.07] border-primary/25 shadow-accent'
          : 'bg-destructive/[0.07] border-destructive/25 shadow-e2'
      )}>
        <div
          data-result-medallion
          className={cn(
            "w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center ring-1",
            passed ? 'bg-primary/15 ring-primary/30' : 'bg-destructive/15 ring-destructive/30'
          )}
        >
          {passed ? (
            <CheckCircle2 className="w-8 h-8 text-primary" />
          ) : (
            <XCircle className="w-8 h-8 text-destructive" />
          )}
        </div>

        <div data-result-score>
          <div className={cn(
            "text-6xl font-semibold tracking-tight tabular-nums leading-none mb-3",
            passed ? 'text-primary' : 'text-destructive'
          )}>
            {result.nota}<span className="text-3xl text-muted-foreground font-normal">/{result.total}</span>
          </div>

          <p className={cn("text-lg font-semibold", passed ? 'text-primary' : 'text-destructive')}>
            {passed ? '¡Aprobado!' : 'No aprobado'}
          </p>

          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            Intento {result.numero_intento}/3
          </p>
        </div>
      </div>

      {/* Critical question alert */}
      {result.critica_fallada && (
        <div data-result-section className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Pregunta Crítica Fallada</p>
            <p className="text-xs text-destructive/70 mt-1 leading-relaxed">
              En el taller real, este error puede quemar un chip o dañar la placa del cliente.
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      <div data-result-section className={cn(
        "p-4 rounded-2xl border",
        passed ? 'bg-primary/[0.04] border-primary/20' : 'surface'
      )}>
        <p className={cn("text-sm leading-relaxed", passed ? 'text-primary/90' : 'text-secondary-foreground')}>
          {result.mensaje}
        </p>
      </div>

      {/* Failed topics */}
      {!passed && result.temas_fallados.length > 0 && (
        <div data-result-section className="space-y-2.5">
          <p className="text-sm font-semibold text-amber-400">Temas a repasar:</p>
          <div className="flex flex-wrap gap-2">
            {result.temas_fallados.map(tema => (
              <span
                key={tema}
                className="px-3 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400"
              >
                {tema.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Answer review */}
      <div data-result-section className="space-y-2.5">
        <p className="text-sm font-semibold text-muted-foreground">Revisión de respuestas</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {result.respuestas_correctas.map((resp) => (
            <div
              key={resp.question_id}
              className="p-3.5 rounded-xl surface text-xs"
            >
              <p className="mb-1">
                <span className="font-semibold text-primary">Respuesta correcta: {resp.respuesta_correcta})</span>
              </p>
              <p className="text-muted-foreground leading-relaxed">{resp.explicacion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div data-result-section className="space-y-3 pt-2">
        {passed ? (
          <>
            {result.siguiente_leccion_desbloqueada && (
              <Button
                onClick={onNextLesson}
                className="pressable w-full py-6 text-base font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Siguiente Lección
              </Button>
            )}
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="pressable w-full py-4 text-muted-foreground hover:text-foreground"
            >
              Volver al Panel
            </Button>
          </>
        ) : result.debe_rever_video ? (
          <>
            <Button
              onClick={onRewatchVideo}
              className="pressable w-full py-6 text-base font-semibold rounded-2xl bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              Volver a Ver el Video
            </Button>
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="pressable w-full py-4 text-muted-foreground hover:text-foreground"
            >
              Volver al Panel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={onRetry}
              className="pressable w-full py-6 text-base font-semibold rounded-2xl bg-amber-600 hover:bg-amber-500 text-white"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reintentar ({result.intentos_restantes} intento{result.intentos_restantes !== 1 ? 's' : ''} restante{result.intentos_restantes !== 1 ? 's' : ''})
            </Button>
            <Button
              onClick={onBackToDashboard}
              variant="ghost"
              className="pressable w-full py-4 text-muted-foreground hover:text-foreground"
            >
              Volver al Panel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

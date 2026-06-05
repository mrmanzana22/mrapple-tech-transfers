"use client";

import { useState, useRef, useCallback } from "react";
import { Play, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  titulo: string;
  videoUrl: string | null;
  onComplete: () => Promise<boolean>;
  onBack: () => void;
  onGoToQuiz: () => void;
  isVideoCompleted: boolean;
}

export function VideoPlayer({
  titulo,
  videoUrl,
  onComplete,
  onBack,
  onGoToQuiz,
  isVideoCompleted,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedIntervals = useRef(new Set<number>());
  const [watchProgress, setWatchProgress] = useState(0);
  const [canProceed, setCanProceed] = useState(isVideoCompleted);
  const [completing, setCompleting] = useState(false);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    // Track 5-second intervals actually watched
    const currentInterval = Math.floor(video.currentTime / 5);
    watchedIntervals.current.add(currentInterval);

    const totalIntervals = Math.ceil(video.duration / 5);
    const percent = Math.min(100, Math.round((watchedIntervals.current.size / totalIntervals) * 100));
    setWatchProgress(percent);

    if (percent >= 90 && !canProceed) {
      setCanProceed(true);
    }
  }, [canProceed]);

  const handleComplete = async () => {
    if (isVideoCompleted) {
      onGoToQuiz();
      return;
    }
    setCompleting(true);
    const success = await onComplete();
    setCompleting(false);
    if (success) {
      onGoToQuiz();
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="pressable text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground tracking-tight truncate">{titulo}</h2>
          <p className="text-sm text-muted-foreground">Mira el video completo para desbloquear el quiz</p>
        </div>
      </div>

      {/* Video */}
      {videoUrl ? (
        <div className="rounded-2xl overflow-hidden bg-black border border-border shadow-e3">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            onTimeUpdate={handleTimeUpdate}
            className="w-full aspect-video"
            playsInline
          />
        </div>
      ) : (
        <div className="rounded-2xl surface aspect-video flex items-center justify-center">
          <div className="text-center">
            <span className="flex h-14 w-14 mx-auto mb-3 items-center justify-center rounded-2xl bg-secondary ring-1 ring-border">
              <Play className="w-7 h-7 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">Video no disponible aún</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Se habilitará cuando se suba el video</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2 rounded-2xl surface p-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progreso de visualización</span>
          <span className="tabular-nums font-medium text-foreground">{watchProgress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-slow ease-out-quint",
              watchProgress >= 90 ? 'bg-primary' : 'bg-sky-500'
            )}
            style={{ width: `${watchProgress}%` }}
          />
        </div>
        {!canProceed && videoUrl && (
          <p className="text-xs text-muted-foreground/80">
            Necesitas ver al menos el 90% del video para continuar
          </p>
        )}
      </div>

      {/* Continue button */}
      <Button
        onClick={handleComplete}
        disabled={(!canProceed && !isVideoCompleted) || completing}
        className={cn(
          "w-full py-6 text-base font-semibold rounded-2xl transition-all duration-base",
          canProceed || isVideoCompleted
            ? 'pressable bg-primary hover:bg-primary/90 text-primary-foreground'
            : 'bg-secondary text-muted-foreground cursor-not-allowed'
        )}
      >
        {completing ? (
          'Guardando...'
        ) : isVideoCompleted ? (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Continuar al Quiz
          </>
        ) : canProceed ? (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Video Completado - Ir al Quiz
          </>
        ) : (
          'Mira el video para continuar'
        )}
      </Button>
    </div>
  );
}

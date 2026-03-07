"use client";

import { useState, useRef, useCallback } from "react";
import { Play, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-white">{titulo}</h2>
          <p className="text-sm text-zinc-500">Mira el video completo para desbloquear el quiz</p>
        </div>
      </div>

      {/* Video */}
      {videoUrl ? (
        <div className="rounded-xl overflow-hidden bg-black border border-zinc-800">
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
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 aspect-video flex items-center justify-center">
          <div className="text-center">
            <Play className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">Video no disponible aún</p>
            <p className="text-xs text-zinc-600 mt-1">Se habilitará cuando se suba el video</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Progreso de visualización</span>
          <span>{watchProgress}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              watchProgress >= 90 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${watchProgress}%` }}
          />
        </div>
        {!canProceed && videoUrl && (
          <p className="text-xs text-zinc-600">
            Necesitas ver al menos el 90% del video para continuar
          </p>
        )}
      </div>

      {/* Continue button */}
      <Button
        onClick={handleComplete}
        disabled={(!canProceed && !isVideoCompleted) || completing}
        className={`w-full py-6 text-base font-semibold rounded-xl transition-all ${
          canProceed || isVideoCompleted
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
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

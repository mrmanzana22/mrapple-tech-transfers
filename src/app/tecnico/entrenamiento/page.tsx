"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTraining } from "@/hooks/use-training";
import { LessonCard } from "@/components/training/lesson-card";
import { VideoPlayer } from "@/components/training/video-player";
import { QuizEngine } from "@/components/training/quiz-engine";
import { QuizResults } from "@/components/training/quiz-results";
import { QUIZ_QUESTIONS } from "@/data/training/quiz-leccion-01-questions";
import { QuizResultResponse, LessonProgress } from "@/types/training";

// Map lesson IDs to their question pools (client-safe, no answers)
const QUIZ_POOLS: Record<string, typeof QUIZ_QUESTIONS> = {
  'leccion-01': QUIZ_QUESTIONS,
};

type View = 'dashboard' | 'video' | 'quiz' | 'results';

export default function EntrenamientoPage() {
  const router = useRouter();
  const { isAuthenticated, tecnico, loading: authLoading } = useAuth();
  const { progress, error: trainingError, isLoading, submitting, completeVideo, getVideoUrl, submitQuiz, refresh } = useTraining();

  const [view, setView] = useState<View>('dashboard');
  const [activeLeccion, setActiveLeccion] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResultResponse | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Get active lesson progress
  const getActiveProgress = useCallback((): (LessonProgress & { titulo: string; descripcion: string; orden: number }) | null => {
    if (!progress || !activeLeccion) return null;
    return progress.find(p => p.leccion === activeLeccion) || null;
  }, [progress, activeLeccion]);

  // Open a lesson
  const openLesson = useCallback(async (leccion: string, estado: string) => {
    setActiveLeccion(leccion);

    if (estado === 'video_pendiente') {
      setLoadingVideo(true);
      const url = await getVideoUrl(leccion);
      setVideoUrl(url);
      setLoadingVideo(false);
      setView('video');
    } else if (estado === 'quiz_pendiente') {
      setView('quiz');
    } else if (estado === 'completada') {
      // Allow re-watching video
      setLoadingVideo(true);
      const url = await getVideoUrl(leccion);
      setVideoUrl(url);
      setLoadingVideo(false);
      setView('video');
    }
  }, [getVideoUrl]);

  // Go back to dashboard
  const goToDashboard = useCallback(() => {
    setView('dashboard');
    setActiveLeccion(null);
    setVideoUrl(null);
    setQuizResult(null);
    refresh();
  }, [refresh]);

  // Handle quiz submission
  const handleQuizSubmit = useCallback(async (
    respuestas: { question_id: number; seleccion: string }[],
    questionIds: number[]
  ) => {
    if (!activeLeccion) return;

    const result = await submitQuiz({
      leccion: activeLeccion,
      respuestas,
      question_ids: questionIds,
    });

    if (result) {
      setQuizResult(result);
      setView('results');
    }
  }, [activeLeccion, submitQuiz]);

  // Loading states
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !tecnico) return null;

  const activeProgress = getActiveProgress();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'dashboard' ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={goToDashboard}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/tecnico')}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-400" />
                Entrenamiento
              </h1>
              <p className="text-xs text-zinc-500">Microsoldadura · {tecnico.nombre}</p>
            </div>
          </div>

          {view === 'dashboard' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refresh()}
              className="text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Welcome card */}
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 p-5">
              <h2 className="text-base font-bold text-white mb-1">
                Programa de Microsoldadura
              </h2>
              <p className="text-sm text-zinc-400">
                Yang Changshun - iPhone Basic Theory. Completa cada lección en orden para avanzar.
              </p>
              {progress && (
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {progress.filter(p => p.estado === 'completada').length}
                    </div>
                    <div className="text-xs text-zinc-500">Completadas</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {progress.length}
                    </div>
                    <div className="text-xs text-zinc-500">Total</div>
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {trainingError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                <p className="text-sm text-red-400 font-medium">Error al cargar progreso:</p>
                <p className="text-xs text-red-300 mt-1">{trainingError.message}</p>
              </div>
            )}

            {/* Lesson list */}
            <div className="space-y-3">
              {progress?.map((lesson) => {
                const intentos = lesson.quiz_intentos?.length || 0;
                const mejorNota = lesson.quiz_intentos?.length
                  ? Math.max(...lesson.quiz_intentos.map((i: { nota: number }) => i.nota))
                  : undefined;

                return (
                  <LessonCard
                    key={lesson.leccion}
                    titulo={lesson.titulo}
                    descripcion={lesson.descripcion}
                    orden={lesson.orden}
                    estado={lesson.estado}
                    intentos={intentos}
                    nota={mejorNota}
                    onClick={() => openLesson(lesson.leccion, lesson.estado)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Video View */}
        {view === 'video' && activeLeccion && (
          loadingVideo ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <VideoPlayer
              titulo={activeProgress?.titulo || ''}
              videoUrl={videoUrl}
              onComplete={() => completeVideo(activeLeccion)}
              onBack={goToDashboard}
              onGoToQuiz={() => setView('quiz')}
              isVideoCompleted={activeProgress?.video_completado || false}
            />
          )
        )}

        {/* Quiz View */}
        {view === 'quiz' && activeLeccion && (
          <QuizEngine
            questions={QUIZ_POOLS[activeLeccion] || []}
            intentoActual={(activeProgress?.quiz_intentos?.length || 0) + 1}
            onSubmit={handleQuizSubmit}
            onBack={goToDashboard}
            submitting={submitting}
            titulo={activeProgress?.titulo || ''}
          />
        )}

        {/* Results View */}
        {view === 'results' && quizResult && (
          <QuizResults
            result={quizResult}
            onRetry={() => {
              setQuizResult(null);
              refresh();
              setView('quiz');
            }}
            onNextLesson={() => {
              // Find and open next lesson
              if (progress && activeLeccion) {
                const currentIndex = progress.findIndex(p => p.leccion === activeLeccion);
                const next = progress[currentIndex + 1];
                if (next) {
                  setActiveLeccion(next.leccion);
                  setQuizResult(null);
                  refresh().then(() => {
                    openLesson(next.leccion, 'video_pendiente');
                  });
                  return;
                }
              }
              goToDashboard();
            }}
            onRewatchVideo={() => {
              setQuizResult(null);
              refresh().then(() => {
                if (activeLeccion) {
                  openLesson(activeLeccion, 'video_pendiente');
                }
              });
            }}
            onBackToDashboard={goToDashboard}
          />
        )}
      </main>
    </div>
  );
}

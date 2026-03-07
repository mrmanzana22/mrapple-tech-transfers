"use client";

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { LessonProgress, SubmitQuizPayload, QuizResultResponse } from '@/types/training';

// Fetcher with auth
async function trainingFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'mrapple',
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

const progressFetcher = async (url: string) => {
  const res = await trainingFetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Error al cargar progreso');
  return json.data as (LessonProgress & { titulo: string; descripcion: string; orden: number })[];
};

export function useTraining() {
  const { data: progress, error, isLoading, mutate } = useSWR(
    '/api/training/progress',
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const [submitting, setSubmitting] = useState(false);

  const completeVideo = useCallback(async (leccion: string): Promise<boolean> => {
    try {
      const res = await trainingFetch('/api/training/complete-video', {
        method: 'POST',
        body: JSON.stringify({ leccion }),
      });
      const json = await res.json();
      if (json.success) {
        mutate(); // Refresh progress
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [mutate]);

  const getVideoUrl = useCallback(async (leccion: string): Promise<string | null> => {
    try {
      const res = await trainingFetch(`/api/training/video-url?leccion=${leccion}`);
      const json = await res.json();
      if (json.success) return json.data.url;
      return null;
    } catch {
      return null;
    }
  }, []);

  const submitQuiz = useCallback(async (payload: SubmitQuizPayload): Promise<QuizResultResponse | null> => {
    setSubmitting(true);
    try {
      const res = await trainingFetch('/api/training/submit-quiz', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        mutate(); // Refresh progress
        return json.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [mutate]);

  return {
    progress,
    error,
    isLoading,
    submitting,
    completeVideo,
    getVideoUrl,
    submitQuiz,
    refresh: mutate,
  };
}

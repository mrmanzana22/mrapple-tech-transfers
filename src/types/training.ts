// Types for Training Platform - Microsoldadura

// ============================================
// LESSON CONFIG (static)
// ============================================

export interface LessonConfig {
  id: string;           // 'leccion-01'
  order: number;
  title: string;
  description: string;
  videoPath: string;    // Path in Supabase Storage
}

// ============================================
// QUIZ DATA
// ============================================

export interface QuizQuestion {
  id: number;
  pregunta: string;
  opciones: string[];
  tema: string;
  critica: boolean;
}

// Server-only: answer key
export interface QuizAnswer {
  respuesta: string;    // 'A', 'B', 'C', or 'D'
  explicacion: string;
}

// ============================================
// PROGRESS (from database)
// ============================================

export type LessonStatus = 'bloqueada' | 'video_pendiente' | 'quiz_pendiente' | 'completada';

export interface QuizAttempt {
  intento: number;
  nota: number;
  aprobado: boolean;
  critica_fallada: boolean;
  temas_fallados: string[];
  respuestas: { question_id: number; seleccion: string; correcto: boolean }[];
  fecha: string;
}

export interface LessonProgress {
  leccion: string;
  estado: LessonStatus;
  video_completado: boolean;
  video_completado_at: string | null;
  quiz_intentos: QuizAttempt[];
  completada_at: string | null;
}

// ============================================
// API PAYLOADS
// ============================================

export interface SubmitQuizPayload {
  leccion: string;
  respuestas: { question_id: number; seleccion: string }[];
  question_ids: number[];
}

export interface QuizResultResponse {
  aprobado: boolean;
  nota: number;
  total: number;
  critica_fallada: boolean;
  numero_intento: number;
  intentos_restantes: number;
  debe_rever_video: boolean;
  temas_fallados: string[];
  respuestas_correctas: { question_id: number; respuesta_correcta: string; explicacion: string }[];
  siguiente_leccion_desbloqueada: boolean;
  mensaje: string;
}

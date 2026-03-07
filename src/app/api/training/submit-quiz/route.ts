// POST /api/training/submit-quiz
// Grades quiz attempt server-side, manages attempts and progression
// CRITICAL: All grading happens here - answers never sent to client

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, validateCsrf, csrfError } from '@/lib/auth-server';
import { addCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { canAccessTraining, getLessonById, getNextLesson, gradeQuiz, getAttemptMessage } from '@/lib/training';
import { getSupabaseServer } from '@/lib/supabase-server';
import { QuizAttempt, QuizResultResponse } from '@/types/training';

// Server-only imports - these NEVER reach the client bundle
import { QUIZ_ANSWERS as QUIZ_01_ANSWERS } from '@/data/training/quiz-leccion-01-answers';
import { QUIZ_QUESTIONS as QUIZ_01_QUESTIONS } from '@/data/training/quiz-leccion-01-questions';

// Map lesson IDs to their quiz data
const QUIZ_DATA: Record<string, {
  answers: Record<number, { respuesta: string; explicacion: string }>;
  questions: { id: number; tema: string; critica: boolean }[];
}> = {
  'leccion-01': {
    answers: QUIZ_01_ANSWERS,
    questions: QUIZ_01_QUESTIONS,
  },
};

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) return addCorsHeaders(csrfError(), request);

  const session = await validateSession(request);
  if (!session) {
    return addCorsHeaders(
      NextResponse.json({ success: false, code: 'NO_SESSION', error: 'No autenticado' }, { status: 401 }),
      request
    );
  }

  if (!canAccessTraining(session.nombre)) {
    return addCorsHeaders(
      NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'No tienes acceso' }, { status: 403 }),
      request
    );
  }

  try {
    const body = await request.json();
    const { leccion, respuestas, question_ids } = body;

    // Validate input
    if (!leccion || !getLessonById(leccion)) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Lección inválida' }, { status: 400 }),
        request
      );
    }

    if (!respuestas || !Array.isArray(respuestas) || respuestas.length !== 10) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Debes enviar exactamente 10 respuestas' }, { status: 400 }),
        request
      );
    }

    if (!question_ids || !Array.isArray(question_ids) || question_ids.length !== 10) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'question_ids inválidos' }, { status: 400 }),
        request
      );
    }

    // Get quiz data for this lesson
    const quizData = QUIZ_DATA[leccion];
    if (!quizData) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Quiz no disponible para esta lección' }, { status: 404 }),
        request
      );
    }

    // Validate question_ids are valid
    const validIds = new Set(quizData.questions.map(q => q.id));
    for (const id of question_ids) {
      if (!validIds.has(id)) {
        return addCorsHeaders(
          NextResponse.json({ success: false, error: 'ID de pregunta inválido' }, { status: 400 }),
          request
        );
      }
    }

    const supabase = getSupabaseServer();

    // Get current progress
    const { data: progress, error: fetchError } = await supabase
      .from('mrapple_training_progress')
      .select('estado, quiz_intentos')
      .eq('tecnico_id', session.tecnico_id)
      .eq('leccion', leccion)
      .single();

    if (fetchError || !progress) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Progreso no encontrado' }, { status: 404 }),
        request
      );
    }

    if (progress.estado !== 'quiz_pendiente') {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'No puedes tomar el quiz en este momento' }, { status: 400 }),
        request
      );
    }

    const intentosPrevios: QuizAttempt[] = progress.quiz_intentos || [];
    const numeroIntento = intentosPrevios.length + 1;

    if (numeroIntento > 3) {
      return addCorsHeaders(
        NextResponse.json({ success: false, error: 'Máximo 3 intentos alcanzados' }, { status: 400 }),
        request
      );
    }

    // Grade the quiz
    const resultado = gradeQuiz(respuestas, quizData.answers, quizData.questions);

    // Build attempt record
    const nuevoIntento: QuizAttempt = {
      intento: numeroIntento,
      nota: resultado.nota,
      aprobado: resultado.aprobado,
      critica_fallada: resultado.critica_fallada,
      temas_fallados: resultado.temas_fallados,
      respuestas: resultado.respuestas_detalle,
      fecha: new Date().toISOString(),
    };

    const todosIntentos = [...intentosPrevios, nuevoIntento];
    const mensaje = getAttemptMessage(numeroIntento, resultado.aprobado, resultado.critica_fallada, resultado.temas_fallados);

    // Build response
    const response: QuizResultResponse = {
      aprobado: resultado.aprobado,
      nota: resultado.nota,
      total: 10,
      critica_fallada: resultado.critica_fallada,
      numero_intento: numeroIntento,
      intentos_restantes: resultado.aprobado ? 0 : Math.max(0, 3 - numeroIntento),
      debe_rever_video: !resultado.aprobado && numeroIntento >= 3,
      temas_fallados: resultado.temas_fallados,
      respuestas_correctas: respuestas.map(r => ({
        question_id: r.question_id,
        respuesta_correcta: quizData.answers[r.question_id]?.respuesta || '',
        explicacion: quizData.answers[r.question_id]?.explicacion || '',
      })),
      siguiente_leccion_desbloqueada: false,
      mensaje,
    };

    if (resultado.aprobado) {
      // PASSED: mark lesson as completed, unlock next
      const nextLesson = getNextLesson(leccion);

      const { error: updateError } = await supabase
        .from('mrapple_training_progress')
        .update({
          estado: 'completada',
          quiz_intentos: todosIntentos,
          completada_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('tecnico_id', session.tecnico_id)
        .eq('leccion', leccion);

      if (updateError) {
        console.error('quiz pass update error:', updateError);
      }

      // Unlock next lesson
      if (nextLesson) {
        const { error: unlockError } = await supabase
          .from('mrapple_training_progress')
          .update({
            estado: 'video_pendiente',
            updated_at: new Date().toISOString(),
          })
          .eq('tecnico_id', session.tecnico_id)
          .eq('leccion', nextLesson.id)
          .eq('estado', 'bloqueada');

        if (!unlockError) {
          response.siguiente_leccion_desbloqueada = true;
        }
      }
    } else if (numeroIntento >= 3) {
      // 3rd FAIL: reset to video_pendiente, clear attempts
      const { error: resetError } = await supabase
        .from('mrapple_training_progress')
        .update({
          estado: 'video_pendiente',
          video_completado: false,
          video_completado_at: null,
          quiz_intentos: todosIntentos, // Keep history
          updated_at: new Date().toISOString(),
        })
        .eq('tecnico_id', session.tecnico_id)
        .eq('leccion', leccion);

      if (resetError) {
        console.error('quiz 3rd fail reset error:', resetError);
      }
    } else {
      // 1st or 2nd FAIL: just save the attempt
      const { error: failError } = await supabase
        .from('mrapple_training_progress')
        .update({
          quiz_intentos: todosIntentos,
          updated_at: new Date().toISOString(),
        })
        .eq('tecnico_id', session.tecnico_id)
        .eq('leccion', leccion);

      if (failError) {
        console.error('quiz fail update error:', failError);
      }
    }

    return addCorsHeaders(
      NextResponse.json({ success: true, data: response }),
      request
    );
  } catch (error) {
    console.error('submit-quiz error:', error);
    return addCorsHeaders(
      NextResponse.json({ success: false, error: 'Error de servidor' }, { status: 500 }),
      request
    );
  }
}

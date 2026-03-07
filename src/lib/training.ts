// Server-side training utilities
// Access control, quiz grading, progress management

import { LESSONS } from '@/data/training/lessons';
import { LessonStatus } from '@/types/training';

// ============================================
// ACCESS CONTROL
// ============================================

const TRAINING_ALLOWED = ['NORMAN', 'IDEL'] as const;

export function canAccessTraining(nombre: string): boolean {
  return TRAINING_ALLOWED.includes(nombre.toUpperCase() as typeof TRAINING_ALLOWED[number]);
}

// ============================================
// QUIZ GRADING
// ============================================

interface GradeResult {
  nota: number;
  aprobado: boolean;
  critica_fallada: boolean;
  temas_fallados: string[];
  respuestas_detalle: { question_id: number; seleccion: string; correcto: boolean }[];
}

export function gradeQuiz(
  respuestas: { question_id: number; seleccion: string }[],
  answerKey: Record<number, { respuesta: string; explicacion: string }>,
  questionsData: { id: number; tema: string; critica: boolean }[]
): GradeResult {
  let correctas = 0;
  let critica_fallada = false;
  const temas_fallados = new Set<string>();
  const respuestas_detalle: GradeResult['respuestas_detalle'] = [];

  for (const resp of respuestas) {
    const key = answerKey[resp.question_id];
    const question = questionsData.find(q => q.id === resp.question_id);
    if (!key || !question) continue;

    const correcto = resp.seleccion === key.respuesta;

    if (correcto) {
      correctas++;
    } else {
      if (question.critica) critica_fallada = true;
      temas_fallados.add(question.tema);
    }

    respuestas_detalle.push({
      question_id: resp.question_id,
      seleccion: resp.seleccion,
      correcto,
    });
  }

  const aprobado = correctas >= 7 && !critica_fallada;

  return {
    nota: correctas,
    aprobado,
    critica_fallada,
    temas_fallados: Array.from(temas_fallados),
    respuestas_detalle,
  };
}

// ============================================
// ATTEMPT MESSAGES
// ============================================

export function getAttemptMessage(
  intento: number,
  aprobado: boolean,
  critica_fallada: boolean,
  temas_fallados: string[]
): string {
  if (aprobado) {
    return '¡Firme! Lección completada. Ya tienes las bases. Esto que aprendiste hoy te va a servir cada día en el taller. Siguiente lección desbloqueada.';
  }

  if (critica_fallada) {
    return 'Fallaste una pregunta CRÍTICA. En el taller real, este error puede quemar un chip o dañar la placa del cliente. Aunque tengas buena nota, necesitas dominar este tema. Revísalo bien.';
  }

  const temasTexto = temas_fallados.length > 0
    ? ` Repasa estos temas: ${temas_fallados.map(t => t.replace(/_/g, ' ')).join(', ')}.`
    : '';

  switch (intento) {
    case 1:
      return `Tranquilo, todos nos equivocamos.${temasTexto} ¡Tú puedes!`;
    case 2:
      return `Último intento. Concéntrate, respira, y lee bien cada pregunta.${temasTexto}`;
    case 3:
      return 'Hermano, necesitas repasar el video. No es que no puedas, es que necesitas prestar más atención a los detalles. En microsoldadura los detalles son TODO. Repite el video, toma notas, y vuelve con todo.';
    default:
      return 'Sigue intentando.';
  }
}

// ============================================
// LESSON HELPERS
// ============================================

export function getLessonById(id: string) {
  return LESSONS.find(l => l.id === id) || null;
}

export function getNextLesson(currentId: string) {
  const currentIndex = LESSONS.findIndex(l => l.id === currentId);
  if (currentIndex === -1 || currentIndex >= LESSONS.length - 1) return null;
  return LESSONS[currentIndex + 1];
}

export function getAllLessonIds(): string[] {
  return LESSONS.map(l => l.id);
}

// ============================================
// PROGRESS INITIALIZATION
// ============================================

export function getInitialProgressRows(tecnicoId: string, tecnicoNombre: string) {
  return LESSONS.map((lesson, index) => ({
    tecnico_id: tecnicoId,
    tecnico_nombre: tecnicoNombre,
    leccion: lesson.id,
    estado: index === 0 ? 'video_pendiente' : 'bloqueada' as LessonStatus,
    video_completado: false,
    video_completado_at: null,
    quiz_intentos: [],
    completada_at: null,
  }));
}

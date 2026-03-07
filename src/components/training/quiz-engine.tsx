"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizQuestion } from "@/types/training";

interface QuizEngineProps {
  questions: QuizQuestion[];
  intentoActual: number;
  onSubmit: (respuestas: { question_id: number; seleccion: string }[], questionIds: number[]) => void;
  onBack: () => void;
  submitting: boolean;
  titulo: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuizEngine({ questions, intentoActual, onSubmit, onBack, submitting, titulo }: QuizEngineProps) {
  // Select 10 random questions on mount
  const selectedQuestions = useMemo(() => {
    return shuffleArray(questions).slice(0, 10);
  }, []); // Empty deps = new random set each mount

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === 10;

  const handleSelect = useCallback((questionId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  }, []);

  const handleSubmit = () => {
    if (!allAnswered) return;

    const respuestas = selectedQuestions.map(q => ({
      question_id: q.id,
      seleccion: answers[q.id],
    }));
    const questionIds = selectedQuestions.map(q => q.id);

    onSubmit(respuestas, questionIds);
    setShowConfirm(false);
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
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">Quiz: {titulo}</h2>
          <p className="text-sm text-zinc-500">
            Intento {intentoActual}/3 · {answeredCount}/10 respondidas
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${(answeredCount / 10) * 100}%` }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {selectedQuestions.map((question, index) => (
          <div
            key={question.id}
            className={`rounded-xl border p-4 transition-all ${
              answers[question.id]
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            {/* Question */}
            <div className="flex gap-3 mb-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                answers[question.id] ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1">
                {question.critica && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-semibold text-red-400 uppercase">Crítica</span>
                  </div>
                )}
                <p className="text-sm text-white font-medium">{question.pregunta}</p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 ml-10">
              {question.opciones.map((opcion) => {
                const letter = opcion.charAt(0);
                const isSelected = answers[question.id] === letter;

                return (
                  <button
                    key={opcion}
                    onClick={() => handleSelect(question.id, letter)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                        : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {opcion}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 pt-4">
        {showConfirm ? (
          <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-yellow-400 font-medium">
              ¿Estás seguro? No podrás cambiar tus respuestas.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConfirm(false)}
                variant="ghost"
                className="flex-1 text-zinc-400"
              >
                Revisar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? 'Enviando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!allAnswered || submitting}
            className={`w-full py-6 text-base font-semibold rounded-xl ${
              allAnswered
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5 mr-2" />
            {allAnswered ? 'Enviar Respuestas' : `Responde todas (${answeredCount}/10)`}
          </Button>
        )}
      </div>
    </div>
  );
}

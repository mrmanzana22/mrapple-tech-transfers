"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, AlertTriangle, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizQuestion } from "@/types/training";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

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
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground tracking-tight truncate">Quiz: {titulo}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            Intento {intentoActual}/3 · {answeredCount}/10 respondidas
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-16 z-10 -mx-4 px-4 py-2 glass hairline-b">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-slow ease-out-quint"
            style={{ width: `${(answeredCount / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <Reveal className="space-y-4" stagger={0.05} y={16}>
        {selectedQuestions.map((question, index) => {
          const answered = !!answers[question.id];
          return (
            <div
              key={question.id}
              className={cn(
                "rounded-2xl border p-5 transition-[border-color,box-shadow,background-color] duration-base ease-out-quint",
                answered
                  ? 'border-primary/30 bg-primary/[0.04] shadow-e1'
                  : 'surface'
              )}
            >
              {/* Question */}
              <div className="flex gap-3 mb-4">
                <span className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold tabular-nums transition-colors duration-base",
                  answered ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                )}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  {question.critica && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-[11px] font-semibold text-destructive uppercase tracking-wide">Crítica</span>
                    </div>
                  )}
                  <p className="text-[15px] text-foreground font-medium leading-snug">{question.pregunta}</p>
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
                      className={cn(
                        "pressable-sm group flex w-full items-center gap-3 text-left p-3 rounded-xl text-sm border transition-[border-color,background-color,color] duration-fast ease-out-quint",
                        isSelected
                          ? 'bg-primary/15 border-primary/45 text-foreground'
                          : 'bg-secondary/50 border-border text-secondary-foreground hover:bg-secondary hover:border-border'
                      )}
                    >
                      <span className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-fast",
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-transparent text-transparent group-hover:border-muted-foreground'
                      )}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="flex-1">{opcion}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Reveal>

      {/* Submit */}
      <div className="sticky bottom-4 pt-4">
        {showConfirm ? (
          <div className="surface-raised border-amber-500/30 rounded-2xl p-4 space-y-3 animate-scale-in">
            <p className="text-sm text-amber-400 font-medium">
              ¿Estás seguro? No podrás cambiar tus respuestas.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConfirm(false)}
                variant="ghost"
                className="pressable flex-1 text-muted-foreground hover:text-foreground"
              >
                Revisar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="pressable flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submitting ? 'Enviando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!allAnswered || submitting}
            className={cn(
              "w-full py-6 text-base font-semibold rounded-2xl transition-all duration-base",
              allAnswered
                ? 'pressable bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5 mr-2" />
            {allAnswered ? 'Enviar Respuestas' : `Responde todas (${answeredCount}/10)`}
          </Button>
        )}
      </div>
    </div>
  );
}

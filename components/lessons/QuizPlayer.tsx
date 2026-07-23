"use client";

import { useState } from "react";

type Question = {
  visual?: string;
  question: string;
  options: (string | number)[];
  answer: string | number;
};

export type QuizContent = {
  instructions?: string;
  questions: Question[];
};

export function QuizPlayer({
  content,
  onComplete,
}: {
  content: QuizContent;
  onComplete?: (result: { correct: number; total: number }) => void;
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = content.questions.length;
  const question = content.questions[step];

  function handleSelect(option: string | number) {
    if (selected !== null) return;
    setSelected(option);

    const isCorrect = option === question.answer;
    const nextCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) setCorrectCount(nextCorrectCount);

    setTimeout(() => {
      if (step + 1 < total) {
        setStep(step + 1);
        setSelected(null);
      } else {
        setFinished(true);
        onComplete?.({ correct: nextCorrectCount, total });
      }
    }, 800);
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="text-xl font-bold">¡Lección completada!</h2>
        <p className="text-gray-600">
          {correctCount} de {total} correctas
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 text-center">
      {content.instructions && (
        <p className="text-sm text-gray-500">{content.instructions}</p>
      )}

      <p className="text-xs font-medium text-gray-400">
        Pregunta {step + 1} de {total}
      </p>

      {question.visual && <p className="text-5xl">{question.visual}</p>}
      <p className="text-lg font-semibold">{question.question}</p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {question.options.map((option) => {
          const isSelected = selected === option;
          const isAnswer = option === question.answer;
          const showFeedback = selected !== null;

          let style = "border-gray-300 hover:border-indigo-400";
          if (showFeedback && isAnswer) {
            style = "border-green-500 bg-green-50 text-green-700";
          } else if (showFeedback && isSelected && !isAnswer) {
            style = "border-red-500 bg-red-50 text-red-700";
          }

          return (
            <button
              key={String(option)}
              disabled={selected !== null}
              onClick={() => handleSelect(option)}
              className={`rounded-xl border-2 px-4 py-3 text-lg font-medium transition ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

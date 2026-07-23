"use client";

import { useState } from "react";

type ItemRound = { visual: string; count: number; answer: number };
type PatternRound = { sequence: string[]; answer: string };

export type DragDropContent = {
  instructions?: string;
  items?: ItemRound[];
  patterns?: PatternRound[];
  options: (string | number)[];
};

type Round = { prompt: string; answer: string | number };

function buildRounds(content: DragDropContent): Round[] {
  if (content.items) {
    return content.items.map((item) => ({
      prompt: item.visual.repeat(item.count),
      answer: item.answer,
    }));
  }
  if (content.patterns) {
    return content.patterns.map((pattern) => ({
      prompt: pattern.sequence.join("  "),
      answer: pattern.answer,
    }));
  }
  return [];
}

export function DragDropPlayer({
  content,
  onComplete,
}: {
  content: DragDropContent;
  onComplete?: (result: { correct: number; total: number }) => void;
}) {
  const [rounds] = useState(() => buildRounds(content));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = rounds.length;
  const round = rounds[step];

  function handleSelect(option: string | number) {
    if (selected !== null) return;
    setSelected(option);

    const isCorrect = option === round.answer;
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

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-6 p-8 text-center">
      {content.instructions && (
        <p className="text-sm text-gray-500">{content.instructions}</p>
      )}

      <p className="text-xs font-medium text-gray-400">
        Ronda {step + 1} de {total}
      </p>

      <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 px-6 py-8">
        <p className="text-4xl tracking-wide">{round.prompt}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {content.options.map((option) => {
          const isSelected = selected === option;
          const isAnswer = option === round.answer;
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
              className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-xl font-medium transition ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

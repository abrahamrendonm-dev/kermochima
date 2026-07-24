"use client";

import { useRef, useState } from "react";

type ItemRound = { visual: string; count: number; answer: number };
type PatternRound = { sequence: string[]; answer: string };

export type DragDropContent = {
  instructions?: string;
  items?: ItemRound[];
  patterns?: PatternRound[];
  options: (string | number)[];
};

type Round = { prompt: string; answer: string | number };

export function formatPatternSequence(sequence: (string | number)[]): string {
  return sequence.join("  ");
}

function buildRounds(content: DragDropContent): Round[] {
  if (content.items) {
    return content.items.map((item) => ({
      prompt: item.visual.repeat(item.count),
      answer: item.answer,
    }));
  }
  if (content.patterns) {
    return content.patterns.map((pattern) => ({
      prompt: formatPatternSequence(pattern.sequence),
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

  const [dragging, setDragging] = useState<{
    option: string | number;
    x: number;
    y: number;
  } | null>(null);
  const [overTarget, setOverTarget] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const total = rounds.length;
  const round = rounds[step];

  function isOverDropZone(x: number, y: number) {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function resolveDrop(option: string | number) {
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

  function handlePointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    option: string | number
  ) {
    if (selected !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({ option, x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setDragging((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    setOverTarget(isOverDropZone(e.clientX, e.clientY));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const dropped = isOverDropZone(e.clientX, e.clientY);
    const option = dragging.option;
    setDragging(null);
    setOverTarget(false);
    if (dropped) resolveDrop(option);
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

      <div
        ref={dropZoneRef}
        className={`flex min-h-[7rem] min-w-[16rem] items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 transition ${
          overTarget
            ? "border-indigo-500 bg-indigo-100"
            : "border-indigo-200 bg-indigo-50"
        }`}
      >
        <p className="text-4xl tracking-wide">{round.prompt}</p>
        {selected !== null && (
          <span
            className={`text-4xl font-bold ${
              selected === round.answer ? "text-green-600" : "text-red-500"
            }`}
          >
            {selected}
          </span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {content.options.map((option) => {
          const isBeingDragged = dragging?.option === option;
          const isAnswerReveal = selected !== null && option === round.answer;
          const isWrongPick =
            selected !== null && selected === option && option !== round.answer;

          let style = "border-gray-300 bg-white";
          if (isAnswerReveal) style = "border-green-500 bg-green-50 text-green-700";
          else if (isWrongPick) style = "border-red-500 bg-red-50 text-red-700";

          return (
            <button
              key={String(option)}
              disabled={selected !== null}
              onPointerDown={(e) => handlePointerDown(e, option)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`flex h-14 w-14 touch-none select-none items-center justify-center rounded-xl border-2 text-xl font-medium transition ${style} ${
                isBeingDragged
                  ? "cursor-grabbing opacity-30"
                  : "cursor-grab active:cursor-grabbing"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {dragging && (
        <div
          className="pointer-events-none fixed z-50 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-indigo-500 bg-white text-xl font-medium shadow-lg"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.option}
        </div>
      )}
    </div>
  );
}

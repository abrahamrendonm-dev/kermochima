"use client";

import { useEffect, useRef, useState } from "react";
import { formatPatternSequence } from "@/components/lessons/DragDropPlayer";

type BalanceRound = {
  left_count: number;
  right_count: number;
  answer: "left" | "right" | "equal";
};

type CountTask = {
  task: "count";
  visual: string;
  question: string;
  answer: number;
};
type CompareTask = {
  task: "compare";
  left: string;
  right: string;
  question: string;
  answer: "left" | "right";
};
type PatternTask = {
  task: "pattern";
  sequence: (string | number)[];
  answer: string | number;
};
type BossTask = CountTask | CompareTask | PatternTask;

export type GameBossContent = {
  instructions?: string;
  game_mechanic?: string;
  time_limit_seconds?: number;
  lives?: number;
  rounds: (BalanceRound | BossTask)[];
  badge_unlocked?: string;
};

type Option = { value: string | number; label: string };

type NormalizedRound =
  | { kind: "balance"; leftCount: number; rightCount: number; answer: string; options: Option[] }
  | { kind: "count"; visual: string; question: string; answer: number; options: Option[] }
  | {
      kind: "compare";
      left: string;
      right: string;
      question: string;
      answer: string;
      options: Option[];
    }
  | { kind: "pattern"; prompt: string; answer: string | number; options: Option[] };

const BALANCE_OPTIONS: Option[] = [
  { value: "left", label: "Izquierda" },
  { value: "equal", label: "Igual" },
  { value: "right", label: "Derecha" },
];

const COMPARE_OPTIONS: Option[] = [
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
];

function buildNumberOptions(answer: number): Option[] {
  const candidates = [answer - 2, answer - 1, answer, answer + 1, answer + 2].filter(
    (n) => n > 0
  );
  return Array.from(new Set(candidates))
    .sort((a, b) => a - b)
    .slice(0, 4)
    .map((n) => ({ value: n, label: String(n) }));
}

function normalizeRounds(content: GameBossContent): NormalizedRound[] {
  return content.rounds.map((round) => {
    if ("left_count" in round) {
      return {
        kind: "balance",
        leftCount: round.left_count,
        rightCount: round.right_count,
        answer: round.answer,
        options: BALANCE_OPTIONS,
      };
    }
    if (round.task === "count") {
      return {
        kind: "count",
        visual: round.visual,
        question: round.question,
        answer: round.answer,
        options: buildNumberOptions(round.answer),
      };
    }
    if (round.task === "compare") {
      return {
        kind: "compare",
        left: round.left,
        right: round.right,
        question: round.question,
        answer: round.answer,
        options: COMPARE_OPTIONS,
      };
    }
    // Los símbolos de la secuencia (excluyendo "?") sirven de distractores.
    // No asumas que la respuesta ya aparece ahí: en patrones aritméticos
    // (ej. 5,10,15,20,? -> 25) el siguiente valor es nuevo, no una repetición.
    const symbols = Array.from(new Set(round.sequence.filter((s) => s !== "?")));
    const optionValues = symbols.includes(round.answer)
      ? symbols
      : [...symbols, round.answer];
    return {
      kind: "pattern",
      prompt: formatPatternSequence(round.sequence),
      answer: round.answer,
      options: optionValues.map((s) => ({ value: s, label: String(s) })),
    };
  });
}

export function GameBossPlayer({
  content,
  onComplete,
}: {
  content: GameBossContent;
  onComplete?: (result: { correct: number; total: number }) => void;
}) {
  const [rounds] = useState(() => normalizeRounds(content));
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState<number | null>(content.lives ?? null);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    content.time_limit_seconds ?? null
  );
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const total = rounds.length;
  const round = rounds[step];

  function finish(finalCorrect: number) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    onComplete?.({ correct: finalCorrect, total });
  }

  // Cuenta regresiva global (no por ronda): si llega a 0, termina con lo acumulado.
  useEffect(() => {
    if (finished || timeLeft === null) return;
    if (timeLeft <= 0) {
      finish(correctCount);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : t)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished]);

  function handleSelect(value: string | number) {
    if (selected !== null || finished) return;
    setSelected(value);

    const isCorrect = value === round.answer;
    const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
    if (isCorrect) setCorrectCount(nextCorrect);

    const nextLives = !isCorrect && lives !== null ? lives - 1 : lives;
    if (!isCorrect && lives !== null) setLives(nextLives);

    setTimeout(() => {
      if (!isCorrect && nextLives !== null && nextLives <= 0) {
        finish(nextCorrect);
        return;
      }
      if (step + 1 < total) {
        setStep(step + 1);
        setSelected(null);
      } else {
        finish(nextCorrect);
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

  function optionStyle(value: string | number, answer: string | number) {
    const isSelected = selected === value;
    const isAnswer = value === answer;
    const showFeedback = selected !== null;
    if (showFeedback && isAnswer) return "border-green-500 bg-green-50 text-green-700";
    if (showFeedback && isSelected && !isAnswer)
      return "border-red-500 bg-red-50 text-red-700";
    return "border-gray-300 hover:border-indigo-400";
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 text-center">
      {content.instructions && (
        <p className="text-sm text-gray-500">{content.instructions}</p>
      )}

      <div className="flex items-center gap-4">
        <p className="text-xs font-medium text-gray-400">
          Ronda {step + 1} de {total}
        </p>
        {timeLeft !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              timeLeft <= 10 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            ⏱ {timeLeft}s
          </span>
        )}
        {lives !== null && (
          <span className="text-sm">{"❤️".repeat(Math.max(lives, 0))}</span>
        )}
      </div>

      {round.kind === "balance" && (
        <div className="flex items-center gap-6">
          <p className="text-3xl">{"⚫".repeat(round.leftCount)}</p>
          <span className="text-xs text-gray-400">vs</span>
          <p className="text-3xl">{"⚫".repeat(round.rightCount)}</p>
        </div>
      )}

      {round.kind === "count" && (
        <>
          <p className="text-4xl">{round.visual}</p>
          <p className="text-lg font-semibold">{round.question}</p>
        </>
      )}

      {round.kind === "compare" && (
        <>
          <div className="flex items-center gap-6">
            <p className="text-3xl">{round.left}</p>
            <span className="text-xs text-gray-400">vs</span>
            <p className="text-3xl">{round.right}</p>
          </div>
          <p className="text-lg font-semibold">{round.question}</p>
        </>
      )}

      {round.kind === "pattern" && (
        <p className="text-4xl tracking-wide">{round.prompt}</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {round.options.map((opt) => (
          <button
            key={String(opt.value)}
            disabled={selected !== null}
            onClick={() => handleSelect(opt.value)}
            className={`rounded-xl border-2 px-4 py-3 text-lg font-medium transition ${optionStyle(
              opt.value,
              round.answer
            )}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuizPlayer, type QuizContent } from "@/components/lessons/QuizPlayer";
import {
  DragDropPlayer,
  type DragDropContent,
} from "@/components/lessons/DragDropPlayer";
import {
  GameBossPlayer,
  type GameBossContent,
} from "@/components/lessons/GameBossPlayer";
import { XPToast } from "@/components/gamification/XPToast";
import { awardXP, type AwardXPResult } from "@/lib/xpEngine";

type Lesson = {
  id: string;
  type: string;
  xp_reward: number;
  content: QuizContent | DragDropContent | GameBossContent;
};

export function LessonRunner({
  lesson,
  profileId,
  nextLessonId,
}: {
  lesson: Lesson;
  profileId: string;
  nextLessonId: string | null;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AwardXPResult | null>(null);

  async function handleComplete({
    correct,
    total,
  }: {
    correct: number;
    total: number;
  }) {
    const xpEarned = Math.round((lesson.xp_reward * correct) / total);
    const awarded = await awardXP(profileId, lesson.id, xpEarned, correct, total);
    setResult(awarded);
  }

  return (
    <>
      {lesson.type === "quiz" && (
        <QuizPlayer
          content={lesson.content as unknown as QuizContent}
          onComplete={handleComplete}
        />
      )}
      {lesson.type === "drag_drop" && (
        <DragDropPlayer
          content={lesson.content as unknown as DragDropContent}
          onComplete={handleComplete}
        />
      )}
      {(lesson.type === "game" || lesson.type === "boss") && (
        <GameBossPlayer
          content={lesson.content as unknown as GameBossContent}
          type={lesson.type as "game" | "boss"}
          onComplete={handleComplete}
        />
      )}

      {result && (
        <XPToast
          result={result}
          onContinue={() => router.push(`/dashboard/${profileId}`)}
          onNext={
            nextLessonId
              ? () => router.push(`/lesson/${nextLessonId}`)
              : undefined
          }
        />
      )}
    </>
  );
}

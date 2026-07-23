"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuizPlayer, type QuizContent } from "@/components/lessons/QuizPlayer";
import { XPToast } from "@/components/gamification/XPToast";
import { awardXP, type AwardXPResult } from "@/lib/xpEngine";

type Lesson = {
  id: string;
  type: string;
  xp_reward: number;
  content: QuizContent;
};

export function LessonRunner({
  lesson,
  profileId,
}: {
  lesson: Lesson;
  profileId: string;
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
    const awarded = await awardXP(profileId, lesson.id, xpEarned);
    setResult(awarded);
  }

  return (
    <>
      {lesson.type === "quiz" && (
        <QuizPlayer content={lesson.content} onComplete={handleComplete} />
      )}

      {result && (
        <XPToast
          result={result}
          onClose={() => {
            setResult(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

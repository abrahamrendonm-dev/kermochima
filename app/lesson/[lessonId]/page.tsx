import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonRunner } from "@/components/lessons/LessonRunner";
import type { QuizContent } from "@/components/lessons/QuizPlayer";
import type { DragDropContent } from "@/components/lessons/DragDropPlayer";
import type { GameBossContent } from "@/components/lessons/GameBossPlayer";

const RUNNABLE_TYPES = ["quiz", "drag_drop", "game", "boss"];

export default async function LessonPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const supabase = createClient();
  const profileId = cookies().get("active_profile_id")?.value;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, type, content, xp_reward")
    .eq("id", params.lessonId)
    .single();

  if (!lesson) {
    notFound();
  }

  if (!profileId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-600">
          Primero selecciona quién va a jugar.
        </p>
        <Link href="/profiles" className="text-indigo-600 hover:underline">
          Ir al selector de perfiles
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">{lesson.title}</h1>

      {RUNNABLE_TYPES.includes(lesson.type) ? (
        <LessonRunner
          profileId={profileId}
          lesson={{
            id: lesson.id,
            type: lesson.type,
            xp_reward: lesson.xp_reward,
            content: lesson.content as QuizContent | DragDropContent | GameBossContent,
          }}
        />
      ) : (
        <p className="text-gray-500">
          El reproductor para lecciones tipo &quot;{lesson.type}&quot; llega
          pronto 🚧
        </p>
      )}
    </main>
  );
}

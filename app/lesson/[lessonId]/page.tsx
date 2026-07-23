import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/components/lessons/QuizPlayer";

export default async function LessonPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const supabase = createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, type, content, xp_reward")
    .eq("id", params.lessonId)
    .single();

  if (!lesson) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">{lesson.title}</h1>

      {lesson.type === "quiz" ? (
        <QuizPlayer content={lesson.content} />
      ) : (
        <p className="text-gray-500">
          El reproductor para lecciones tipo &quot;{lesson.type}&quot; llega
          pronto 🚧
        </p>
      )}
    </main>
  );
}

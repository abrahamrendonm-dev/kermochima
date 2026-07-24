import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChildSummaries, ForbiddenError } from "@/lib/parentSummary";

type LessonStatus = "none" | "attempted" | "passed";

const STATUS_LABEL: Record<LessonStatus, { label: string; className: string }> = {
  none: { label: "No jugada", className: "bg-gray-100 text-gray-500" },
  attempted: { label: "Intentada", className: "bg-yellow-100 text-yellow-700" },
  passed: { label: "✓ Aprobada", className: "bg-green-100 text-green-700" },
};

export default async function DashboardPage({
  params,
}: {
  params: { profileId: string };
}) {
  // Misma verificación explícita de pertenencia que /parent: profileId de la
  // URL es la fuente de verdad para esta ruta (ya lleva el id), pero se
  // valida contra el padre autenticado en vez de confiar solo en RLS.
  let children;
  try {
    children = await getChildSummaries(params.profileId);
  } catch (err) {
    if (err instanceof ForbiddenError) notFound();
    throw err;
  }
  const child = children[0];
  if (!child) notFound();

  const supabase = createClient();
  const age = new Date().getFullYear() - child.birthYear;

  const { data: mathSubject } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", "Matemáticas")
    .maybeSingle();

  const { data: tracks } = mathSubject
    ? await supabase
        .from("tracks")
        .select("id, name, min_age, max_age, order_index")
        .eq("subject_id", mathSubject.id)
        .order("order_index", { ascending: true })
    : { data: [] };

  const track = (tracks ?? []).find((t) => age >= t.min_age && age <= t.max_age);

  let lessons: {
    id: string;
    title: string;
    xp_reward: number;
  }[] = [];
  const statusByLesson = new Map<string, LessonStatus>();

  if (track) {
    const { data: trackLessons } = await supabase
      .from("lessons")
      .select("id, title, xp_reward")
      .eq("track_id", track.id)
      .order("order_index", { ascending: true });
    lessons = trackLessons ?? [];

    const lessonIds = lessons.map((l) => l.id);
    const { data: progress } =
      lessonIds.length > 0
        ? await supabase
            .from("user_progress")
            .select("lesson_id, passed")
            .eq("profile_id", child.profileId)
            .in("lesson_id", lessonIds)
        : { data: [] };

    for (const lesson of lessons) {
      const row = (progress ?? []).find((p) => p.lesson_id === lesson.id);
      statusByLesson.set(lesson.id, !row ? "none" : row.passed ? "passed" : "attempted");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            {child.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{child.name}</h1>
            <p className="text-sm text-gray-500">
              Nivel {child.level} · {child.totalXp} XP · 🔥 {child.currentStreak} días
            </p>
          </div>
        </div>
        <Link href="/profiles" className="text-sm text-indigo-600 hover:underline">
          Cambiar de perfil
        </Link>
      </div>

      {child.badges.length > 0 && (
        <div className="flex w-full max-w-2xl flex-wrap gap-2">
          {child.badges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm"
            >
              <span>{badge.icon ?? "🏅"}</span>
              <span>{badge.name}</span>
            </div>
          ))}
        </div>
      )}

      {!track ? (
        <p className="text-gray-500">
          Todavía no hay un track de Matemáticas para tu edad ({age} años).
        </p>
      ) : (
        <div className="flex w-full max-w-2xl flex-col gap-3">
          <h2 className="text-lg font-semibold">{track.name}</h2>
          {lessons.map((lesson) => {
            const status = statusByLesson.get(lesson.id) ?? "none";
            const statusStyle = STATUS_LABEL[status];
            return (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition hover:border-indigo-400 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium">{lesson.title}</p>
                  <p className="text-xs text-gray-400">{lesson.xp_reward} XP</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.className}`}
                >
                  {statusStyle.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

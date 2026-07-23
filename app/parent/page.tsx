import Link from "next/link";
import { redirect } from "next/navigation";
import { getChildSummaries, ForbiddenError } from "@/lib/parentSummary";
import { SignOutButton } from "@/components/profiles/SignOutButton";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Aún no ha jugado";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ParentPage() {
  let children;
  try {
    children = await getChildSummaries();
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/login");
    throw err;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-2xl font-bold">Panel del padre</h1>
        <div className="flex items-center gap-4">
          <Link href="/profiles" className="text-sm text-indigo-600 hover:underline">
            Selector de perfiles
          </Link>
          <SignOutButton />
        </div>
      </div>

      {children.length === 0 && (
        <p className="text-gray-500">
          Todavía no hay perfiles de hijos.{" "}
          <Link href="/profiles" className="text-indigo-600 hover:underline">
            Agrega uno
          </Link>
          .
        </p>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {children.map((child) => (
          <div
            key={child.profileId}
            className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl">
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{child.name}</p>
                <p className="text-xs text-gray-500">
                  Nivel {child.level} · {child.totalXp} XP
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <p>🔥 Racha: {child.currentStreak} días</p>
              <p className="text-xs text-gray-500">
                Última vez jugado: {formatDate(child.lastPlayedDate)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-gray-400">
                Progreso por track
              </p>
              {child.trackProgress.map((track) => {
                const pct =
                  track.total > 0 ? Math.round((track.completed / track.total) * 100) : 0;
                return (
                  <div key={track.trackId} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{track.trackName}</span>
                      <span className="text-gray-500">
                        {track.completed}/{track.total}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase text-gray-400">
                Insignias ganadas
              </p>
              {child.badges.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no ha ganado insignias.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {child.badges.map((badge, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>
                        {badge.icon ?? "🏅"} {badge.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(badge.earnedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className={`flex flex-col gap-2 rounded-xl p-3 ${
                child.strugglingLessons.length > 0 ? "bg-amber-50" : "bg-gray-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-gray-400">
                Posible dificultad
              </p>
              {child.strugglingLessons.length === 0 ? (
                <p className="text-sm text-gray-500">Sin señales de dificultad.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {child.strugglingLessons.map((lesson) => (
                    <li key={lesson.lessonId} className="text-sm text-amber-800">
                      {lesson.title} — {lesson.attempts} intentos sin completar
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

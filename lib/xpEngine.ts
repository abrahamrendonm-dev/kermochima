"use server";

import { createClient } from "@/lib/supabase/server";

const XP_PER_LEVEL = 100;

// Umbral de aciertos para considerar una lección "aprobada" (passed), a
// diferencia de solo "completada" (llegar al final, gane o pierda).
const PASS_THRESHOLD = 0.6;

// Insignias "progreso": se otorgan cuando TODAS las lecciones listadas (por
// título) tienen passed=true para el perfil. Agregar un track nuevo es
// agregar una entrada aquí, no escribir lógica nueva.
const PROGRESS_BADGE_LESSONS: Record<string, string[]> = {
  "Contador Estrella (Bronce)": ["Contando del 1 al 10", "Contando del 11 al 20"],
  "Sumador Estrella": ["Suma sin llevar", "Suma con llevar"],
};

// Insignias "boss": se otorgan cuando la lección boss correspondiente (por
// título) tiene passed=true.
const BOSS_BADGE_LESSON: Record<string, string> = {
  "Domador del Mercado": "Reto del Mercado (Boss Final)",
  "Velocista Matemático": "Carrera de Sumas (Boss Final)",
};

// Insignia "crecimiento": regla global, no depende de lecciones específicas
// ni de ningún track — ya era genérica antes de este cambio.
const GROWTH_BADGE_NAME = "No me rindo";

const ALL_BADGE_NAMES = [
  ...Object.keys(PROGRESS_BADGE_LESSONS),
  ...Object.keys(BOSS_BADGE_LESSON),
  GROWTH_BADGE_NAME,
];

export type AwardXPResult = {
  xpEarned: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  currentStreak: number;
  longestStreak: number;
  newBadges: { id: string; name: string; icon: string | null }[];
};

function computeLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export async function awardXP(
  profileId: string,
  lessonId: string,
  xpEarned: number,
  correct: number,
  total: number
): Promise<AwardXPResult> {
  const supabase = createClient();

  const passedThisAttempt = total > 0 && correct / total >= PASS_THRESHOLD;

  // --- user_progress: upsert (marks completed, tracks attempts/best_score/passed) ---
  const { data: existingProgress } = await supabase
    .from("user_progress")
    .select("attempts, best_score, passed")
    .eq("profile_id", profileId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  await supabase.from("user_progress").upsert(
    {
      profile_id: profileId,
      lesson_id: lessonId,
      completed: true,
      passed: (existingProgress?.passed ?? false) || passedThisAttempt,
      attempts: (existingProgress?.attempts ?? 0) + 1,
      best_score: Math.max(existingProgress?.best_score ?? 0, xpEarned),
      completed_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,lesson_id" }
  );

  // --- user_stats: XP, nivel y racha diaria ---
  const { data: existingStats } = await supabase
    .from("user_stats")
    .select("total_xp, level, gems, current_streak, longest_streak, last_played_date")
    .eq("profile_id", profileId)
    .maybeSingle();

  const today = todayStr();
  const previousLevel = existingStats?.level ?? 1;
  const previousXp = existingStats?.total_xp ?? 0;
  const totalXp = previousXp + xpEarned;
  const level = computeLevel(totalXp);

  let currentStreak = 1;
  if (existingStats?.last_played_date) {
    if (existingStats.last_played_date === today) {
      currentStreak = existingStats.current_streak;
    } else if (daysBetween(today, existingStats.last_played_date) === 1) {
      currentStreak = existingStats.current_streak + 1;
    } else {
      currentStreak = 1;
    }
  }
  const longestStreak = Math.max(existingStats?.longest_streak ?? 0, currentStreak);

  await supabase.from("user_stats").upsert(
    {
      profile_id: profileId,
      total_xp: totalXp,
      level,
      gems: existingStats?.gems ?? 0,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_played_date: today,
    },
    { onConflict: "profile_id" }
  );

  // --- badges: evaluación simple basada en tablas de datos (ver arriba),
  // válida para cualquier track sin reescribir lógica ---
  const newBadges: AwardXPResult["newBadges"] = [];

  const { data: candidateBadges } = await supabase
    .from("badges")
    .select("id, name, icon")
    .in("name", ALL_BADGE_NAMES);

  if (candidateBadges && candidateBadges.length > 0) {
    const { data: alreadyEarned } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("profile_id", profileId)
      .in(
        "badge_id",
        candidateBadges.map((b) => b.id)
      );
    const earnedIds = new Set(alreadyEarned?.map((b) => b.badge_id) ?? []);

    const { data: progressRows } = await supabase
      .from("user_progress")
      .select("attempts, passed, lessons(title)")
      .eq("profile_id", profileId);

    const passedTitles = new Set(
      (progressRows ?? [])
        .filter((row) => row.passed)
        .map((row) => (row.lessons as unknown as { title: string } | null)?.title)
    );
    // "Falló antes, ahora sí lo logró": necesita más de un intento en total y
    // haber aprobado (en algún momento, no necesariamente el último intento).
    const hasFailedThenPassed = (progressRows ?? []).some(
      (row) => row.passed && row.attempts >= 2
    );

    const qualifies: Record<string, boolean> = {
      [GROWTH_BADGE_NAME]: hasFailedThenPassed,
    };
    for (const [badgeName, requiredTitles] of Object.entries(PROGRESS_BADGE_LESSONS)) {
      qualifies[badgeName] = requiredTitles.every((title) => passedTitles.has(title));
    }
    for (const [badgeName, bossTitle] of Object.entries(BOSS_BADGE_LESSON)) {
      qualifies[badgeName] = (progressRows ?? []).some(
        (row) =>
          row.passed &&
          (row.lessons as unknown as { title: string } | null)?.title === bossTitle
      );
    }

    for (const badge of candidateBadges) {
      if (earnedIds.has(badge.id)) continue;
      if (!qualifies[badge.name]) continue;

      const { error } = await supabase
        .from("user_badges")
        .insert({ profile_id: profileId, badge_id: badge.id });
      if (!error) newBadges.push(badge);
    }
  }

  return {
    xpEarned,
    totalXp,
    level,
    leveledUp: level > previousLevel,
    currentStreak,
    longestStreak,
    newBadges,
  };
}

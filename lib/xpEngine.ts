"use server";

import { createClient } from "@/lib/supabase/server";

const XP_PER_LEVEL = 100;

const TRACK_A_BADGES = {
  counter: "Contador Estrella (Bronce)",
  noGiveUp: "No me rindo",
  bossSlayer: "Domador del Mercado",
} as const;

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
  xpEarned: number
): Promise<AwardXPResult> {
  const supabase = createClient();

  // --- user_progress: upsert (marks completed, tracks attempts/best_score) ---
  const { data: existingProgress } = await supabase
    .from("user_progress")
    .select("attempts, best_score")
    .eq("profile_id", profileId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  await supabase.from("user_progress").upsert(
    {
      profile_id: profileId,
      lesson_id: lessonId,
      completed: true,
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

  // --- badges: evaluación simple, hardcoded para Track A ---
  const newBadges: AwardXPResult["newBadges"] = [];

  const { data: candidateBadges } = await supabase
    .from("badges")
    .select("id, name, icon")
    .in("name", Object.values(TRACK_A_BADGES));

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
      .select("completed, attempts, best_score, lessons(title, xp_reward)")
      .eq("profile_id", profileId);

    const completedTitles = new Set(
      (progressRows ?? [])
        .filter((row) => row.completed)
        .map((row) => (row.lessons as unknown as { title: string } | null)?.title)
    );
    const hasRetriedAndCompleted = (progressRows ?? []).some(
      (row) => row.completed && row.attempts >= 2
    );

    // El boss tiene vidas y tiempo límite: terminar la lección no es lo mismo
    // que vencerla (puede terminar por quedarse sin vidas/tiempo). Solo cuenta
    // como "vencido" si el mejor intento obtuvo el XP completo de la lección
    // (es decir, todas las rondas correctas).
    const bossRow = (progressRows ?? []).find(
      (row) =>
        (row.lessons as unknown as { title: string } | null)?.title ===
        "Reto del Mercado (Boss Final)"
    );
    const bossDefeated =
      !!bossRow?.completed &&
      bossRow.best_score ===
        (bossRow.lessons as unknown as { xp_reward: number } | null)?.xp_reward;

    const qualifies: Record<string, boolean> = {
      [TRACK_A_BADGES.counter]:
        completedTitles.has("Contando del 1 al 10") &&
        completedTitles.has("Contando del 11 al 20"),
      [TRACK_A_BADGES.noGiveUp]: hasRetriedAndCompleted,
      [TRACK_A_BADGES.bossSlayer]: bossDefeated,
    };

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

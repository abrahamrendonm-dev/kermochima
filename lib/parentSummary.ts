import { createClient } from "@/lib/supabase/server";

export class ForbiddenError extends Error {}

export type ChildSummary = {
  profileId: string;
  name: string;
  birthYear: number;
  level: number;
  totalXp: number;
  currentStreak: number;
  lastPlayedDate: string | null;
  trackProgress: { trackId: string; trackName: string; completed: number; total: number }[];
  badges: { name: string; icon: string | null; earnedAt: string }[];
  strugglingLessons: { lessonId: string; title: string; attempts: number }[];
};

/**
 * Returns gamification summaries for the authenticated parent's own children.
 * Pass `profileIdFilter` to scope to a single child. Ownership is verified
 * explicitly in application code (not left to RLS alone): a profileId that
 * doesn't belong to the authenticated parent throws ForbiddenError, and every
 * row later fetched from user_stats/user_progress/user_badges is re-checked
 * against the parent's own profile ids before being used.
 */
export async function getChildSummaries(
  profileIdFilter?: string
): Promise<ChildSummary[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ForbiddenError("Not authenticated");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, birth_year")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  const ownedIds = new Set((profiles ?? []).map((p) => p.id));

  if (profileIdFilter && !ownedIds.has(profileIdFilter)) {
    throw new ForbiddenError("This profile does not belong to the authenticated parent");
  }

  const targetProfiles = profileIdFilter
    ? (profiles ?? []).filter((p) => p.id === profileIdFilter)
    : (profiles ?? []);

  if (targetProfiles.length === 0) return [];

  const targetIds = targetProfiles.map((p) => p.id);

  const [{ data: stats }, { data: progress }, { data: badges }, { data: tracks }, { data: allLessons }] =
    await Promise.all([
      supabase.from("user_stats").select("*").in("profile_id", targetIds),
      supabase
        .from("user_progress")
        .select("profile_id, completed, attempts, lesson_id, lessons(id, title, track_id)")
        .in("profile_id", targetIds),
      supabase
        .from("user_badges")
        .select("profile_id, earned_at, badges(name, icon)")
        .in("profile_id", targetIds),
      supabase.from("tracks").select("id, name"),
      supabase.from("lessons").select("id, track_id"),
    ]);

  // Defense in depth: never trust a query result blindly, even one we just
  // built the filter for. If anything outside targetIds slipped through,
  // treat it as an authorization failure rather than silently including it.
  for (const row of [...(stats ?? []), ...(progress ?? []), ...(badges ?? [])]) {
    if (!targetIds.includes(row.profile_id)) {
      throw new ForbiddenError("Query returned a profile_id outside the authorized set");
    }
  }

  const lessonsPerTrack = new Map<string, number>();
  for (const lesson of allLessons ?? []) {
    lessonsPerTrack.set(lesson.track_id, (lessonsPerTrack.get(lesson.track_id) ?? 0) + 1);
  }
  const trackNameById = new Map((tracks ?? []).map((t) => [t.id, t.name]));

  return targetProfiles.map((profile) => {
    const stat = (stats ?? []).find((s) => s.profile_id === profile.id);
    const profileProgress = (progress ?? []).filter((p) => p.profile_id === profile.id);
    const profileBadges = (badges ?? []).filter((b) => b.profile_id === profile.id);

    const completedByTrack = new Map<string, number>();
    for (const row of profileProgress) {
      const trackId = (row.lessons as unknown as { track_id: string } | null)?.track_id;
      if (row.completed && trackId) {
        completedByTrack.set(trackId, (completedByTrack.get(trackId) ?? 0) + 1);
      }
    }

    const trackProgress = Array.from(lessonsPerTrack.entries()).map(([trackId, total]) => ({
      trackId,
      trackName: trackNameById.get(trackId) ?? "Track",
      completed: completedByTrack.get(trackId) ?? 0,
      total,
    }));

    const strugglingLessons = profileProgress
      .filter((row) => !row.completed && row.attempts >= 3)
      .map((row) => ({
        lessonId: row.lesson_id,
        title: (row.lessons as unknown as { title: string } | null)?.title ?? "Lección",
        attempts: row.attempts,
      }));

    return {
      profileId: profile.id,
      name: profile.name,
      birthYear: profile.birth_year,
      level: stat?.level ?? 1,
      totalXp: stat?.total_xp ?? 0,
      currentStreak: stat?.current_streak ?? 0,
      lastPlayedDate: stat?.last_played_date ?? null,
      trackProgress,
      badges: profileBadges
        .map((b) => ({
          name: (b.badges as unknown as { name: string } | null)?.name ?? "Insignia",
          icon: (b.badges as unknown as { icon: string | null } | null)?.icon ?? null,
          earnedAt: b.earned_at,
        }))
        .sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : -1)),
      strugglingLessons,
    };
  });
}

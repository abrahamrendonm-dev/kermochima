// Seeds a track + its lessons (and subject, if missing) from a content JSON
// file like content/math-track-a.json into Supabase. Idempotent: re-running
// it will not create duplicate subjects, tracks, or lessons.
//
// Usage:
//   node --env-file=.env.local scripts/seed-track.mjs content/math-track-a.json

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/seed-track.mjs <path-to-content.json>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const raw = await readFile(filePath, "utf8");
const data = JSON.parse(raw);

async function upsertSubject(name) {
  const { data: existing, error: selectError } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from("subjects")
    .insert({ name })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log(`Created subject "${name}"`);
  return inserted.id;
}

async function upsertTrack(subjectId, track) {
  const { data: existing, error: selectError } = await supabase
    .from("tracks")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("name", track.name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from("tracks")
    .insert({
      subject_id: subjectId,
      name: track.name,
      min_age: track.min_age,
      max_age: track.max_age,
      order_index: track.order_index,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log(`Created track "${track.name}"`);
  return inserted.id;
}

async function upsertLesson(trackId, lesson) {
  const { data: existing, error: selectError } = await supabase
    .from("lessons")
    .select("id")
    .eq("track_id", trackId)
    .eq("title", lesson.title)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    console.log(`  Skipped (exists): "${lesson.title}"`);
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("lessons")
    .insert({
      track_id: trackId,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      xp_reward: lesson.xp_reward,
      order_index: lesson.order_index,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log(`  Inserted lesson: "${lesson.title}" (${lesson.type})`);
  return inserted.id;
}

const BADGE_ICONS = {
  "Contador Estrella (Bronce)": "🥉",
  "No me rindo": "💪",
  "Domador del Mercado": "🏅",
};

async function upsertBadge(badge) {
  const { data: existing, error: selectError } = await supabase
    .from("badges")
    .select("id")
    .eq("name", badge.name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from("badges")
    .insert({
      name: badge.name,
      description: badge.unlock_condition,
      icon: BADGE_ICONS[badge.name] ?? "🏅",
      category: badge.category,
      unlock_condition: badge.unlock_condition,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  console.log(`Created badge "${badge.name}"`);
  return inserted.id;
}

const subjectId = await upsertSubject(data.track.subject);
const trackId = await upsertTrack(subjectId, data.track);

for (const lesson of data.lessons) {
  await upsertLesson(trackId, lesson);
}

for (const badge of data.badges_in_track ?? []) {
  await upsertBadge(badge);
}

console.log("Seed complete.");

-- ============================================================
-- App Educativa Gamificada — esquema inicial + RLS
-- ============================================================

-- Perfiles de los hijos
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references auth.users(id) not null,
  name text not null,
  birth_year int not null,
  avatar_config jsonb default '{}',
  pin text,
  created_at timestamp default now()
);

-- Materias
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  color text
);

-- Tracks por edad dentro de una materia
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  name text not null,
  min_age int,
  max_age int,
  order_index int
);

-- Lecciones dentro de un track
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id),
  title text not null,
  type text not null,
  content jsonb not null,
  xp_reward int default 10,
  order_index int
);

-- Insignias disponibles
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  category text,
  unlock_condition jsonb
);

-- Progreso del hijo por lección
create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  lesson_id uuid references lessons(id),
  completed boolean default false,
  best_score int,
  attempts int default 0,
  completed_at timestamp
);

-- Insignias ganadas
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  badge_id uuid references badges(id),
  earned_at timestamp default now()
);

-- Estado general del hijo (XP, nivel, gemas, racha)
create table if not exists user_stats (
  profile_id uuid primary key references profiles(id),
  total_xp int default 0,
  level int default 1,
  gems int default 0,
  current_streak int default 0,
  longest_streak int default 0,
  last_played_date date
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table tracks enable row level security;
alter table lessons enable row level security;
alter table badges enable row level security;
alter table user_progress enable row level security;
alter table user_badges enable row level security;
alter table user_stats enable row level security;

-- profiles: el padre solo ve/edita sus propios perfiles de hijos
create policy "profiles_select_own"
  on profiles for select
  using (parent_id = auth.uid());

create policy "profiles_insert_own"
  on profiles for insert
  with check (parent_id = auth.uid());

create policy "profiles_update_own"
  on profiles for update
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "profiles_delete_own"
  on profiles for delete
  using (parent_id = auth.uid());

-- catálogo (subjects, tracks, lessons, badges): lectura pública, sin escritura de clientes
create policy "subjects_public_read"
  on subjects for select
  using (true);

create policy "tracks_public_read"
  on tracks for select
  using (true);

create policy "lessons_public_read"
  on lessons for select
  using (true);

create policy "badges_public_read"
  on badges for select
  using (true);

-- user_progress: acceso solo si profile_id pertenece a un perfil del padre autenticado
create policy "user_progress_select_own"
  on user_progress for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_progress.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_progress_insert_own"
  on user_progress for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_progress.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_progress_update_own"
  on user_progress for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_progress.profile_id
        and profiles.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_progress.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_progress_delete_own"
  on user_progress for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_progress.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

-- user_badges: mismo criterio que user_progress
create policy "user_badges_select_own"
  on user_badges for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_badges.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_badges_insert_own"
  on user_badges for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_badges.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_badges_delete_own"
  on user_badges for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_badges.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

-- user_stats: mismo criterio
create policy "user_stats_select_own"
  on user_stats for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_stats.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_stats_insert_own"
  on user_stats for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_stats.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "user_stats_update_own"
  on user_stats for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_stats.profile_id
        and profiles.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_stats.profile_id
        and profiles.parent_id = auth.uid()
    )
  );

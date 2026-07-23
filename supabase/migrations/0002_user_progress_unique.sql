-- Un perfil tiene, a lo más, una fila de progreso por lección.
-- Necesario para poder hacer upsert (profile_id, lesson_id) desde el motor de XP.
alter table user_progress
  add constraint user_progress_profile_lesson_unique unique (profile_id, lesson_id);

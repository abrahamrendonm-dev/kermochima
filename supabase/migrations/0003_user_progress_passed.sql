-- "completed" solo indica que un intento llegó al final (ganado o perdido).
-- "passed" indica que el intento alcanzó el umbral de aciertos (ver PASS_THRESHOLD
-- en lib/xpEngine.ts) y es lo que ahora determina progreso real e insignias.
alter table user_progress
  add column if not exists passed boolean not null default false;

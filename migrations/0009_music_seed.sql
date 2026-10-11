-- Starter music.
--
-- 0008 created the library empty (the old 100-entry manifest pointed at mp3s
-- that were never in the repository). This seeds the three tracks the app now
-- really ships, synthesized deterministically by `scripts/generate-music.mjs`
-- and served from `public/music/`.
--
-- They are ordinary library rows: staff can rename, reorder or delete them in
-- the admin music editor. `on conflict ... do nothing` keeps the insert safe to
-- re-run and leaves an edited track alone.
--
-- Keep in sync with the generator: `node scripts/generate-music.mjs --check`
-- (and `scripts/music-schema.test.mjs`) fails when a file is missing, empty, or
-- not the length this file claims.
insert into music_tracks (id, title, artist, source, seconds, sort_order) values
  ('starter-first-light',    'First Light',    'Clock Time', '/music/first-light.mp3',    30, 1),
  ('starter-starfall',       'Starfall',       'Clock Time', '/music/starfall.mp3',       30, 2),
  ('starter-midnight-pulse', 'Midnight Pulse', 'Clock Time', '/music/midnight-pulse.mp3', 30, 3)
on conflict (id) do nothing;

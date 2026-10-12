-- Music library.
--
-- 30 tracks, three minutes each, synthesized deterministically by
-- `scripts/generate-music.mjs` (which writes this file) and served from
-- `public/music/`. 0009 seeded the first three; this replaces every starter
-- row with the full catalogue, so a database that ran the old seed ends up
-- with the same library the app ships.
--
-- They are ordinary library rows: staff can rename, reorder or delete them in
-- the admin music editor. `on conflict ... do nothing` keeps the insert safe
-- to re-run and leaves an edited track alone.
--
-- Keep in sync with the generator: `node scripts/generate-music.mjs --check`
-- (and `scripts/music-schema.test.mjs`) fails when a file is missing, empty,
-- or not the length this file claims.
delete from music_tracks where id like 'starter-%';
insert into music_tracks (id, title, artist, source, seconds, sort_order) values
  ('starter-first-light', 'First Light', 'Clock Time', '/music/first-light.mp3', 180, 1),
  ('starter-starfall', 'Starfall', 'Clock Time', '/music/starfall.mp3', 180, 2),
  ('starter-midnight-pulse', 'Midnight Pulse', 'Clock Time', '/music/midnight-pulse.mp3', 180, 3),
  ('starter-northern-drift', 'Northern Drift', 'Clock Time', '/music/northern-drift.mp3', 180, 4),
  ('starter-cobalt-hours', 'Cobalt Hours', 'Clock Time', '/music/cobalt-hours.mp3', 180, 5),
  ('starter-slow-orbit', 'Slow Orbit', 'Clock Time', '/music/slow-orbit.mp3', 180, 6),
  ('starter-lantern-tide', 'Lantern Tide', 'Clock Time', '/music/lantern-tide.mp3', 180, 7),
  ('starter-paper-sky', 'Paper Sky', 'Clock Time', '/music/paper-sky.mp3', 180, 8),
  ('starter-quiet-machines', 'Quiet Machines', 'Clock Time', '/music/quiet-machines.mp3', 180, 9),
  ('starter-glass-horizon', 'Glass Horizon', 'Clock Time', '/music/glass-horizon.mp3', 180, 10),
  ('starter-ember-line', 'Ember Line', 'Clock Time', '/music/ember-line.mp3', 180, 11),
  ('starter-low-gravity', 'Low Gravity', 'Clock Time', '/music/low-gravity.mp3', 180, 12),
  ('starter-night-ferry', 'Night Ferry', 'Clock Time', '/music/night-ferry.mp3', 180, 13),
  ('starter-amber-static', 'Amber Static', 'Clock Time', '/music/amber-static.mp3', 180, 14),
  ('starter-long-exposure', 'Long Exposure', 'Clock Time', '/music/long-exposure.mp3', 180, 15),
  ('starter-silver-hours', 'Silver Hours', 'Clock Time', '/music/silver-hours.mp3', 180, 16),
  ('starter-deep-field', 'Deep Field', 'Clock Time', '/music/deep-field.mp3', 180, 17),
  ('starter-tidal-glass', 'Tidal Glass', 'Clock Time', '/music/tidal-glass.mp3', 180, 18),
  ('starter-neon-rainfall', 'Neon Rainfall', 'Clock Time', '/music/neon-rainfall.mp3', 180, 19),
  ('starter-cold-sun', 'Cold Sun', 'Clock Time', '/music/cold-sun.mp3', 180, 20),
  ('starter-harbour-lights', 'Harbour Lights', 'Clock Time', '/music/harbour-lights.mp3', 180, 21),
  ('starter-slow-comet', 'Slow Comet', 'Clock Time', '/music/slow-comet.mp3', 180, 22),
  ('starter-wire-and-rain', 'Wire & Rain', 'Clock Time', '/music/wire-and-rain.mp3', 180, 23),
  ('starter-aurora-fold', 'Aurora Fold', 'Clock Time', '/music/aurora-fold.mp3', 180, 24),
  ('starter-palm-static', 'Palm Static', 'Clock Time', '/music/palm-static.mp3', 180, 25),
  ('starter-blanket-fog', 'Blanket Fog', 'Clock Time', '/music/blanket-fog.mp3', 180, 26),
  ('starter-solar-tide', 'Solar Tide', 'Clock Time', '/music/solar-tide.mp3', 180, 27),
  ('starter-last-train-home', 'Last Train Home', 'Clock Time', '/music/last-train-home.mp3', 180, 28),
  ('starter-years-end', 'Year''s End', 'Clock Time', '/music/years-end.mp3', 180, 29),
  ('starter-countdown', 'Countdown', 'Clock Time', '/music/countdown.mp3', 180, 30)
on conflict (id) do nothing;

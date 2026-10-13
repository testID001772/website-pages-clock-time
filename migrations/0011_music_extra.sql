-- Music library: ten longer tracks (10–30 minutes each).
--
-- Synthesized by `scripts/generate-music.mjs --extra` and served from
-- `public/music/`. Plain inserts: a row that already exists is left alone.
--
-- Keep in sync with the generator: `node scripts/generate-music.mjs --check`.
insert into music_tracks (id, title, artist, source, seconds, sort_order) values
  ('extra-years-end-sad-friends', 'Years End: Sad Friends', 'Clock Time', '/music/years-end-sad-friends.mp3', 600, 31),
  ('extra-years-end-happy-friends', 'Years End: Happy Friends', 'Clock Time', '/music/years-end-happy-friends.mp3', 420, 32),
  ('extra-the-end-sad-leaving', 'The End: Sad Leaving', 'Clock Time', '/music/the-end-sad-leaving.mp3', 720, 33),
  ('extra-minecraft-steve-herobrine-2010-2026', 'Minecraft: Steve & Herobrine 2010–2026', 'Clock Time', '/music/minecraft-steve-herobrine-2010-2026.mp3', 1800, 34),
  ('extra-minecraft-the-end-steve-herobrine-2010-2026', 'Minecraft: The End, Steve & Herobrine 2010–2026', 'Clock Time', '/music/minecraft-the-end-steve-herobrine-2010-2026.mp3', 1800, 35),
  ('extra-minecraft-found-herobrine-2010', 'Minecraft: Found Herobrine 2010', 'Clock Time', '/music/minecraft-found-herobrine-2010.mp3', 1500, 36),
  ('extra-minecraft-sad-friends-years-end', 'Minecraft: Sad Friends, Years End', 'Clock Time', '/music/minecraft-sad-friends-years-end.mp3', 960, 37),
  ('extra-minecraft-sad-leaving', 'Minecraft: Sad Leaving', 'Clock Time', '/music/minecraft-sad-leaving.mp3', 1080, 38),
  ('extra-minecraft-play-world-end', 'Minecraft: Play World End', 'Clock Time', '/music/minecraft-play-world-end.mp3', 1560, 39),
  ('extra-leaving-the-end', 'Leaving the End', 'Clock Time', '/music/leaving-the-end.mp3', 420, 40)
on conflict (id) do nothing;

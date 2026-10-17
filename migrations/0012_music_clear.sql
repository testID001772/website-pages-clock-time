-- Clear the shipped playlist: the 30 starter tracks (0009/0010) and the 10
-- extra tracks (0011). Only those seeded ids are removed, so any track staff
-- uploaded through the app (its own id) stays. public/music/*.mp3 and
-- library.json are not touched by this migration.
delete from music_tracks where id like 'starter-%' or id like 'extra-%';

-- Music library.
--
-- Starts EMPTY on purpose. The app used to ship a generated manifest of 100
-- tracks whose mp3s were never in the repo, so every row was dead; the library
-- is now whatever staff add in the admin music editor.
--
-- `source` is either an uploaded `data:audio/...;base64,` payload (served back
-- through `/api/music/<id>`) or a playable URL / site path.
create table if not exists music_tracks (
  id text primary key,
  title text not null check (char_length(title) between 1 and 120),
  artist text not null default '' check (char_length(artist) <= 120),
  source text not null,
  -- Display length. 0 means "unknown" (a linked URL we cannot probe).
  seconds integer not null default 0 check (seconds >= 0 and seconds <= 21600),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists music_tracks_order_idx on music_tracks (sort_order, created_at);

-- Clock Time news feed: announcements staff write, everyone reads.
--
-- Applies to both backends — scripts/migrate.mjs (Neon, at deploy) and the
-- PGLite startup pass in src/lib/db.ts (sandbox preview). Keep it idempotent:
-- `create table if not exists` + `on conflict do nothing` seeds.
create table if not exists news_posts (
  id          text primary key,
  title       text not null,
  summary     text not null default '',
  body        text not null default '',
  tag         text not null default 'update',
  pinned      boolean not null default false,
  published   boolean not null default false,
  author_id   text,
  -- Denormalized so the feed can show a byline without joining profiles, and so
  -- a post keeps its author's name at the time it was written.
  author_name text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint news_posts_tag_chk check (tag in ('update', 'release', 'event', 'note')),
  constraint news_posts_title_len_chk check (char_length(title) between 3 and 120),
  constraint news_posts_summary_len_chk check (char_length(summary) <= 240),
  constraint news_posts_body_len_chk check (char_length(body) <= 4000)
);

-- The feed query: published posts, pinned first, newest first.
create index if not exists news_posts_feed_idx
  on news_posts (published, pinned desc, created_at desc);

-- Starter posts so a fresh install shows a real feed instead of an empty page.
-- Explicit ids and timestamps keep this seed idempotent and the order stable.
insert into news_posts
  (id, title, summary, body, tag, pinned, published, author_name, created_at, updated_at)
values
  (
    'welcome-v2',
    'Clock Time v1 is live',
    'Glass controls, eleven languages and a sky that follows your local time.',
    E'The countdown got a full rebuild.\n\nEvery panel is real glass now — background blur, fill and tint are set from the admin page and saved for everyone. The clock reads your device time zone, so midnight is your midnight, not the server''s.\n\nAlso in this release:\n\n• Eleven languages, switchable from the header\n• A motion setting that pauses decoration without ever stopping the clock\n• Installable as an app, with an offline app shell\n• A 100-track ambient playlist for the wait',
    'update',
    true,
    true,
    'Clock Time',
    '2026-10-03 09:00:00+00',
    '2026-10-03 09:00:00+00'
  ),
  (
    'new-year-countdown',
    'The New Year countdown runs all year',
    'Years, months, days, hours, minutes and seconds until the ball drops.',
    E'The home page counts to the next New Year down to the second, and keeps counting after midnight — the card flips to how much of the new year has already gone by.\n\nBetween Decembers it doubles as a year-progress bar: the thin line under the clock shows how much of the current year has passed, accurate to a hundredth of a percent.\n\nWant a preview of the finale? The button under the countdown fires the fireworks early.',
    'event',
    false,
    true,
    'Clock Time',
    '2026-09-21 08:30:00+00',
    '2026-09-21 08:30:00+00'
  ),
  (
    'gta-vi-countdown',
    'Counting down to Grand Theft Auto VI',
    'November 19, 2026 — plus the rest of the release calendar.',
    E'The countdown now tracks the games worth waiting for. Grand Theft Auto VI is featured, and the expandable list below it covers the rest of the announced calendar.\n\nDates are stored as local moments, so the timer matches the release day in your own time zone. Once a game ships, its card stays up for a week as "Out now" before the next one takes over.',
    'release',
    false,
    true,
    'Clock Time',
    '2026-09-05 11:15:00+00',
    '2026-09-05 11:15:00+00'
  ),
  (
    'install-on-your-phone',
    'Install Clock Time on your phone',
    'Add it to your home screen and the countdown works offline.',
    E'Clock Time is a web app, but it does not have to feel like one.\n\nOn iOS, open the share sheet and choose "Add to Home Screen". On Android, use the install prompt in the header. Either way you get a full-screen countdown with its own icon, and the app shell is cached so it opens instantly — and still opens without a connection.',
    'note',
    false,
    true,
    'Clock Time',
    '2026-08-24 07:45:00+00',
    '2026-08-24 07:45:00+00'
  )
on conflict (id) do nothing;

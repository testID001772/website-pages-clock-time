-- Brand rename follow-up: System Space -> Clock Time.
--
-- `0005_news.sql` seeds the starter posts by id and records itself as applied,
-- so a database that already ran it keeps the old brand in those rows (and in
-- their byline). Editing 0005 would only fix fresh installs. This migration
-- rebrands what is still on the old name and nothing else:
--
--  * restricted to the seeded ids, so posts written by staff are untouched;
--  * a plain word replacement, so an edited seeded post keeps its wording;
--  * idempotent — a fresh database that ran the updated 0005 matches no rows.
update news_posts
set title = replace(title, 'System Space', 'Clock Time'),
    summary = replace(summary, 'System Space', 'Clock Time'),
    body = replace(body, 'System Space', 'Clock Time'),
    author_name = replace(author_name, 'System Space', 'Clock Time')
where id in ('welcome-v2', 'new-year-countdown', 'gta-vi-countdown', 'install-on-your-phone')
  and (
    title like '%System Space%'
    or summary like '%System Space%'
    or body like '%System Space%'
    or author_name like '%System Space%'
  );

-- The seed title read "System Space v2 is live"; the app is versioned
-- independently of the rename, so it became "Clock Time v1 is live".
update news_posts
set title = 'Clock Time v1 is live'
where id = 'welcome-v2'
  and title = 'Clock Time v2 is live';

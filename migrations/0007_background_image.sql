-- Background image switch.
--
-- The app now ships a default background image (public/background.jpg) that is
-- used whenever no custom image has been uploaded, so a fresh install is not a
-- flat gradient. `background_enabled` is the admin's opt-OUT: with it off the
-- stage renders no image at all (the original gradient-only look).
--
-- Existing rows keep `background_url = null` and get the default image, which
-- is the intent — the previous "cleared" state meant "no custom image", not
-- "never show one".
alter table site_settings
  add column if not exists background_enabled boolean not null default true;

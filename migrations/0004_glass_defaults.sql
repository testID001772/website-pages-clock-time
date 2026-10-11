-- Glassmorphism used to ship disabled (glass_blur = 0, glass_opacity = 10),
-- so cards rendered as flat translucent rectangles instead of glass. Bump
-- rows that are still on those original untouched defaults; anything an
-- admin has deliberately configured is left alone.
update site_settings
set glass_blur = 12,
    glass_opacity = 20
where id = 1
  and glass_blur = 0
  and glass_opacity = 10
  and background_url is null;

-- System Space profiles + site-wide appearance.
create table if not exists profiles (
  user_id      text primary key,
  display_name text not null default '',
  bio          text not null default '',
  avatar_url   text,
  role         text not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_role_chk check (role in ('member', 'admin', 'owner'))
);

create index if not exists profiles_role_idx on profiles (role);

create table if not exists site_settings (
  id               integer primary key,
  background_url   text,
  background_blur  integer not null default 0,
  glass_blur       integer not null default 12,
  glass_opacity    integer not null default 20,
  glass_color      text not null default '#ffffff',
  glass_auto       boolean not null default true,
  updated_at       timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1),
  constraint site_settings_blur_chk check (background_blur between 0 and 40),
  constraint site_settings_glass_blur_chk check (glass_blur between 0 and 40),
  constraint site_settings_glass_opacity_chk check (glass_opacity between 0 and 40)
);

insert into site_settings (id)
values (1)
on conflict (id) do nothing;

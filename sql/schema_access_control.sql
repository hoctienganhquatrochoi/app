alter table game_units add column if not exists is_demo boolean not null default false;
alter table game_students add column if not exists allowed_class_ids jsonb not null default '[]'::jsonb;

alter table game_units disable row level security;
alter table game_students disable row level security;

alter table game_teaching_groups add column if not exists default_allowed_class_ids jsonb not null default '[]'::jsonb;

alter table game_teaching_groups disable row level security;

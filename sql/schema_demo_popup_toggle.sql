alter table game_admin_settings add column if not exists demo_popup_enabled boolean not null default false;
alter table game_admin_settings add column if not exists demo_popup_class_id text;

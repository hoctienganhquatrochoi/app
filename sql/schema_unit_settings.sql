-- Chạy thêm trong Supabase SQL Editor
-- Lưu danh sách dạng bài bị admin tắt cho từng Unit (mặc định bật hết nếu chưa có dòng nào)
create table if not exists game_unit_settings (
  unit_id text primary key,
  disabled_activity_ids jsonb not null default '[]'::jsonb
);

alter table game_unit_settings disable row level security;

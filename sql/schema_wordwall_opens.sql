create table if not exists game_wordwall_opens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references game_students(id) on delete cascade,
  unit_id text not null,
  wordwall_name text not null,
  opened_at timestamptz not null default now()
);

alter table game_wordwall_opens disable row level security;

-- Thêm cột lưu thời gian học sinh ở lại màn Wordwall (giây), để phân biệt
-- "mở rồi thoát ngay" với "mở và làm bài thật".
alter table game_wordwall_opens add column if not exists duration_seconds int;

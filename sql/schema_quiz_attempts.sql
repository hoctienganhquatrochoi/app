-- Chạy thêm trong Supabase SQL Editor (sau khi đã chạy schema.sql)
-- Lưu kết quả từng lượt làm bài (Quiz / Khuyết chữ cái) để admin xem báo cáo

create table if not exists game_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references game_students(id) on delete cascade,
  unit_id text not null,
  activity_type text not null,
  score int not null,
  total int not null,
  started_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  answers jsonb not null
);

alter table game_quiz_attempts disable row level security;

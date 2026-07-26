-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Ghi lại khi hệ thống phát hiện học sinh mở Wordwall liên tục dưới 15 giây
-- nhiều lần trong thời gian ngắn (mở rồi thoát ngay để làm giả lượt học).

create table if not exists game_cheat_flags (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references game_students(id) on delete cascade,
  reason text not null,
  flagged_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

alter table game_cheat_flags disable row level security;

create index if not exists game_cheat_flags_student_idx on game_cheat_flags(student_id);

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới.

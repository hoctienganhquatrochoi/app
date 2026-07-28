-- Toán có lời văn - điền số vào chỗ trống (nhiều chỗ trống dùng chung 1 nhóm đáp án).
-- Chạy trong Supabase SQL Editor (project english-for-kids).

create table if not exists game_math_dragfill (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  set_name text not null,
  sort_order int not null default 0,
  passage text not null,
  correct_answers jsonb not null default '[]'::jsonb,
  wrong_answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table game_math_dragfill disable row level security;

-- Nếu dòng "disable row level security" báo lỗi, chạy lại riêng dòng đó trong 1 query mới.

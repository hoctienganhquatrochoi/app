-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Thêm ngày sinh/SĐT (không bắt buộc) cho học sinh, và bảng giao bài kiểm tra theo lớp.

alter table game_students add column if not exists date_of_birth date;
alter table game_students add column if not exists phone_number text;

create table if not exists game_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id text not null,
  unit_id text not null,
  activity_type text not null,
  activity_name text not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table game_assignments disable row level security;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

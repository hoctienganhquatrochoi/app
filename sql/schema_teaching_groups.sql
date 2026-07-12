-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Tách "Nhóm học sinh" (lớp học sinh thật bạn dạy tại trung tâm) ra khỏi
-- "Lớp" (khối lớp nội dung, VD Lớp 3/Lớp 6/Từ vựng) — 2 khái niệm khác nhau.
-- Học sinh giờ thuộc về 1 Nhóm học sinh, không thuộc về khối lớp nội dung nữa
-- (nhóm học sinh có thể học nội dung của bất kỳ khối lớp nào).

create table if not exists game_teaching_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table game_teaching_groups disable row level security;

alter table game_students add column if not exists group_id uuid;
alter table game_students drop column if exists class_id;

alter table game_assignments add column if not exists group_id uuid;
alter table game_assignments drop column if exists class_id;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

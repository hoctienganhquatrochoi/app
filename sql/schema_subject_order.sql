-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép sắp xếp thứ tự Môn học trong 1 Lớp bằng mũi tên lên/xuống,
-- giống cách Lớp và Unit đã làm.

alter table game_subjects add column if not exists sort_order integer not null default 0;

-- Nếu dòng dưới báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi hay gặp với bảng/cột mới trong project này — dù bảng đã tồn tại,
-- chạy lại disable RLS cho chắc):
alter table game_subjects disable row level security;

-- Môn học đã có từ trước đều mặc định sort_order = 0 (trùng nhau), khiến
-- nút mũi tên sắp xếp bị lỗi (nhảy lung tung thay vì đổi chỗ đúng 2 môn).
-- Chạy dòng dưới 1 lần để gán lại thứ tự ban đầu cho các môn đã có sẵn.
update game_subjects s
set sort_order = sub.rn - 1
from (
  select id, row_number() over (partition by class_id order by created_at, id) as rn
  from game_subjects
) sub
where s.id = sub.id;

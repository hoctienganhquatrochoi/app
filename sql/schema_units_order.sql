-- Chạy trong Supabase SQL Editor sau schema_curriculum.sql
-- Thêm cột sắp xếp thứ tự cho Unit trong từng Môn học (để dùng nút mũi tên lên/xuống)

alter table game_units add column if not exists sort_order integer not null default 0;

-- Gán lại số thứ tự cho các Unit đã có sẵn theo đúng thứ tự tạo trước đó trong từng Môn
-- (bắt buộc phải chạy dòng này, nếu không mọi Unit cũ đều có sort_order = 0 giống nhau,
-- khiến nút mũi tên đẩy Unit nhảy xuống cuối thay vì chỉ đổi chỗ với Unit liền kề).
with ranked as (
  select id, row_number() over (partition by subject_id order by created_at) - 1 as rn
  from game_units
)
update game_units
set sort_order = ranked.rn
from ranked
where game_units.id = ranked.id;

-- Chạy thêm trong Supabase SQL Editor sau schema_curriculum.sql
-- Thêm cột sắp xếp thứ tự cho Lớp (để dùng nút mũi tên lên/xuống trong admin)

alter table game_classes add column if not exists sort_order integer not null default 0;

update game_classes set sort_order = 0 where id = 'c1';
update game_classes set sort_order = 1 where id = 'c2';

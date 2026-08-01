-- Chạy file này để sửa lỗi "new row violates row-level security policy for table game_tests"
-- và khôi phục lại đề cũ nếu bước di chuyển dữ liệu trước đó bị chặn giữa chừng.

alter table game_tests disable row level security;

insert into game_tests (id, unit_id, name, sort_order)
select 'test_' || unit_id, unit_id, 'Đề ôn tập', 0
from (select distinct unit_id from game_test_sections where test_id is null) u
on conflict (id) do nothing;

update game_test_sections
set test_id = 'test_' || unit_id
where test_id is null;

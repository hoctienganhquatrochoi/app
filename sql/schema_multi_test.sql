-- Cho phép mỗi Unit có NHIỀU đề (thay vì chỉ 1 "Đề ôn tập" gộp chung), mỗi đề tự đặt tên tùy ý.

create table if not exists game_tests (
  id text primary key,
  unit_id text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table game_tests disable row level security;

alter table game_test_sections add column if not exists test_id text;

-- Di chuyển dữ liệu cũ: mỗi Unit đã có Mục đề thì tạo 1 đề tên "Đề ôn tập" chứa hết các Mục đó.
insert into game_tests (id, unit_id, name, sort_order)
select 'test_' || unit_id, unit_id, 'Đề ôn tập', 0
from (select distinct unit_id from game_test_sections where test_id is null) u
on conflict (id) do nothing;

update game_test_sections
set test_id = 'test_' || unit_id
where test_id is null;

create index if not exists game_test_sections_test_id_idx on game_test_sections(test_id);
create index if not exists game_tests_unit_id_idx on game_tests(unit_id);

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới.

-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép nhúng bài Wordwall có sẵn vào 1 Unit, hiện thành 1 "Dạng bài"
-- riêng bên cạnh Thẻ đọc/Quiz/Kiểm tra nói..., học sinh chơi ngay trong trang.

create table if not exists game_wordwall_activities (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  name text not null,
  embed_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table game_wordwall_activities disable row level security;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi hay gặp với bảng mới trong project này).

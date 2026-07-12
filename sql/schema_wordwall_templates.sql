-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bộ "template" tên bài Wordwall dùng chung cho mọi Unit (VD "Mầm Non",
-- "Tiểu Học"...), mỗi template là 1 danh sách tên bài mẫu. Khi soạn 1 Unit,
-- bấm chọn nhanh 1 template sẽ tạo sẵn các dòng tên bài (chưa có link) để
-- dán link vào dần — dòng chưa có link sẽ tự ẩn khỏi học sinh cho tới khi
-- có link.

create table if not exists game_wordwall_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists game_wordwall_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references game_wordwall_templates(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table game_wordwall_templates disable row level security;
alter table game_wordwall_template_items disable row level security;

-- Cho phép link Wordwall để trống tạm thời (dòng "chưa có link" sẽ tự ẩn
-- khỏi học sinh cho tới khi dán link vào).
alter table game_wordwall_activities alter column embed_url drop not null;

-- Nếu các dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong
-- 1 query mới (lỗi hay gặp với bảng mới trong project này).

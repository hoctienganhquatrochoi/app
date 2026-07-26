-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- 1) Đếm số lần rời màn hình khi làm Wordwall (giống các dạng bài khác).
-- 2) Ảnh chụp màn hình kết quả Wordwall học sinh gửi lên để xác nhận (Lớp 2 trở lên).
-- 3) Ghi lại thiết bị đăng nhập mỗi ngày để phát hiện dùng chung tài khoản.

alter table game_wordwall_opens add column if not exists tab_switch_count int not null default 0;

create table if not exists game_wordwall_photos (
  id uuid primary key default gen_random_uuid(),
  wordwall_open_id uuid references game_wordwall_opens(id) on delete cascade,
  student_id uuid references game_students(id) on delete cascade,
  photo_url text not null,
  uploaded_at timestamptz not null default now()
);

alter table game_wordwall_photos disable row level security;

create table if not exists game_login_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references game_students(id) on delete cascade,
  device_id text not null,
  login_day date not null,
  first_seen_at timestamptz not null default now(),
  unique (student_id, device_id, login_day)
);

alter table game_login_events disable row level security;

-- Tạo bucket lưu ảnh (public để hiện được ảnh trực tiếp bằng URL).
insert into storage.buckets (id, name, public)
values ('wordwall-proof', 'wordwall-proof', true)
on conflict (id) do nothing;

-- Cho phép trang học sinh (dùng anon key) tải ảnh lên/xóa ảnh cũ, và admin xem ảnh.
create policy if not exists "wordwall-proof insert" on storage.objects
  for insert to anon
  with check (bucket_id = 'wordwall-proof');

create policy if not exists "wordwall-proof select" on storage.objects
  for select to anon
  using (bucket_id = 'wordwall-proof');

create policy if not exists "wordwall-proof delete" on storage.objects
  for delete to anon
  using (bucket_id = 'wordwall-proof');

-- Nếu dòng "disable row level security" hoặc "create policy" báo lỗi, chạy lại riêng dòng đó
-- trong 1 query mới. Nếu tạo bucket bằng SQL báo lỗi, vào Supabase Dashboard > Storage > New bucket,
-- đặt tên đúng "wordwall-proof" và bật Public, rồi chạy lại phần "create policy" ở trên.

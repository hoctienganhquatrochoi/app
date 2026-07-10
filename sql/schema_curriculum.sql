-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bảng Lớp / Môn học / Unit để admin tự tạo, thay cho hardcode trong js/data.js.
-- Giữ nguyên id cũ (c1, c2, s1..s5, u1..u5) để không phá dữ liệu game_vocab /
-- game_students / game_unit_settings / game_quiz_attempts đang tham chiếu tới chúng.

create table if not exists game_classes (
  id text primary key,
  name text not null,
  level text not null default 'tieuhoc',
  created_at timestamptz not null default now()
);

alter table game_classes disable row level security;

create table if not exists game_subjects (
  id text primary key,
  class_id text not null references game_classes(id) on delete cascade,
  name text not null,
  color text not null default '#2D6A4F',
  created_at timestamptz not null default now()
);

alter table game_subjects disable row level security;

create table if not exists game_units (
  id text primary key,
  subject_id text not null references game_subjects(id) on delete cascade,
  name text not null,
  content_type text not null default 'vocab',
  created_at timestamptz not null default now()
);

alter table game_units disable row level security;

-- Nếu 3 lệnh "alter table ... disable row level security" ở trên báo lỗi 42501,
-- chạy lại riêng từng dòng đó trong 1 query mới (lỗi này hay gặp trong project này).

-- Seed dữ liệu hiện có (giữ nguyên để trang học không đổi gì)
insert into game_classes (id, name, level) values
  ('c1', 'Lớp 3A', 'tieuhoc'),
  ('c2', 'Mầm non - Lá', 'mamnon')
on conflict (id) do nothing;

insert into game_subjects (id, class_id, name, color) values
  ('s1', 'c1', 'Tiếng Anh', '#2D6A4F'),
  ('s2', 'c1', 'Toán', '#F77F00'),
  ('s3', 'c1', 'Tiếng Việt', '#E63946'),
  ('s4', 'c2', 'Tiếng Anh', '#2D6A4F'),
  ('s5', 'c2', 'Tiếng Việt', '#E63946')
on conflict (id) do nothing;

insert into game_units (id, subject_id, name, content_type) values
  ('u1', 's1', 'Trái cây – Fruits', 'vocab'),
  ('u2', 's2', 'Phép cộng trong phạm vi 10', 'grammar'),
  ('u3', 's3', 'Âm vần ao - au', 'grammar'),
  ('u4', 's4', 'Con vật – Animals', 'vocab'),
  ('u5', 's5', 'Chữ cái a, b, c', 'grammar')
on conflict (id) do nothing;

-- "Đề kiểm tra" (Test) — gộp nhiều bài đã soạn sẵn ở các dạng khác nhau (trắc nghiệm ngữ pháp,
-- điền từ, nối câu, toán điền số, đoạn văn/hội thoại...) thành 1 đề duy nhất, học sinh làm liền
-- mạch từ mục 1 đến mục cuối, ra 1 điểm tổng duy nhất.
--
-- Một "Đề kiểm tra" chính là 1 Unit (game_units) với content_type = 'test' — không cần bảng
-- Unit riêng, tận dụng toàn bộ hạ tầng Lớp/Môn/Unit/quyền truy cập sẵn có. Bảng dưới đây chỉ lưu
-- danh sách các mục (section) bên trong 1 đề, mỗi mục trỏ tới 1 bài đã soạn sẵn ở Unit khác.
-- Chạy trong Supabase SQL Editor (project english-for-kids).

create table if not exists game_test_sections (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  section_type text not null check (section_type in ('grammar-mcq', 'grammar-typing', 'grammar-matching', 'grammar-dragfill', 'math-dragfill', 'text-dragfill')),
  source_unit_id text not null,
  source_set_name text not null,
  label text,
  created_at timestamptz not null default now()
);

alter table game_test_sections disable row level security;

create index if not exists game_test_sections_unit_idx on game_test_sections(unit_id);

-- Nếu dòng "disable row level security" báo lỗi, chạy lại riêng dòng đó trong 1 query mới.

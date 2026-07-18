-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bảng "Học vần/chữ" tiếng Việt cho mầm non: chữ cái, từ đơn, từ ghép, câu.
-- Cả 4 tầng dùng chung 1 bảng (khác chữ_cái/từ_đơn/từ_ghép/câu qua cột tier)
-- vì cùng 1 hình dạng dữ liệu, không có nghĩa dịch (đã là tiếng Việt).

create table if not exists game_viet_literacy (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  tier text not null check (tier in ('letter','word','compound','sentence')),
  sort_order int not null default 0,
  text_vi text not null,
  audio_override_text text,
  audio_vi_url text,
  created_at timestamptz not null default now()
);

alter table game_viet_literacy disable row level security;

create index if not exists game_viet_literacy_unit_tier_idx on game_viet_literacy(unit_id, tier);

alter table game_units add column if not exists highlight_target text;

-- Nếu dòng disable RLS ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bảng mới theo quy ước tiền tố game_, RLS tắt (đúng quy ước cũ của project này)

create extension if not exists pgcrypto;

create table if not exists game_vocab (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  emoji text,
  word_en text not null,
  phonetic text,
  meaning_vi text not null,
  audio_en_url text,
  audio_vi_url text,
  created_at timestamptz not null default now()
);

alter table game_vocab disable row level security;

create table if not exists game_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  class_id text not null,
  username text not null unique,
  pin text not null,
  start_date date not null default current_date,
  expiry_date date not null,
  created_at timestamptz not null default now()
);

alter table game_students disable row level security;

-- Sau khi chạy xong, vào Storage > New bucket:
--   Tên bucket: vocab-audio
--   Public bucket: BẬT (để phát audio trực tiếp bằng public URL)

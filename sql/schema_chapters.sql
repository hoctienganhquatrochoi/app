create table if not exists game_chapters (
  id text primary key,
  subject_id text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table game_chapters disable row level security;

create index if not exists game_chapters_subject_idx on game_chapters(subject_id);

alter table game_units add column if not exists chapter_id text;

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới.

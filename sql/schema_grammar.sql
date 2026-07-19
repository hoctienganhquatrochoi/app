-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- 2 bảng cho phần "Ngữ pháp": trắc nghiệm gạch chân đáp án, và viết câu trả lời.

create table if not exists game_grammar_mcq (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  question text,
  correct_answer text not null,
  wrong_answers text[] not null,
  created_at timestamptz not null default now()
);

alter table game_grammar_mcq disable row level security;
create index if not exists game_grammar_mcq_unit_idx on game_grammar_mcq(unit_id);

create table if not exists game_grammar_typing (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  prompt text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table game_grammar_typing disable row level security;
create index if not exists game_grammar_typing_unit_idx on game_grammar_typing(unit_id);

alter table game_grammar_typing add column if not exists set_name text not null default 'Viết câu trả lời';
create index if not exists game_grammar_typing_unit_set_idx on game_grammar_typing(unit_id, set_name);

create table if not exists game_grammar_matching (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  left_text text not null,
  right_text text not null,
  created_at timestamptz not null default now()
);

alter table game_grammar_matching disable row level security;
create index if not exists game_grammar_matching_unit_idx on game_grammar_matching(unit_id);

create table if not exists game_grammar_dragfill (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  question_en text not null,
  question_vi text,
  correct_answer text not null,
  wrong_answers text[] not null,
  created_at timestamptz not null default now()
);

alter table game_grammar_dragfill disable row level security;
create index if not exists game_grammar_dragfill_unit_idx on game_grammar_dragfill(unit_id);

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

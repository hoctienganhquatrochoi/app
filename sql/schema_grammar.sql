-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- 2 bảng cho phần "Ngữ pháp": trắc nghiệm gạch chân đáp án, và viết câu trả lời.

create table if not exists game_grammar_mcq (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  question text,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
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

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

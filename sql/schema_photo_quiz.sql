-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Dạng bài "Đọc/Nghe theo ảnh": chụp ảnh cả bài lên, học sinh nhìn ảnh rồi trả lời các câu hỏi hiện bên dưới.

create table if not exists game_photo_quiz_sets (
  unit_id text not null,
  set_name text not null,
  image_url text,
  primary key (unit_id, set_name)
);

alter table game_photo_quiz_sets disable row level security;

create table if not exists game_photo_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  set_name text not null,
  sort_order int not null default 0,
  question text not null,
  correct_answer text not null,
  wrong_answers text[],
  created_at timestamptz not null default now()
);

alter table game_photo_quiz_questions disable row level security;
create index if not exists game_photo_quiz_questions_unit_set_idx on game_photo_quiz_questions(unit_id, set_name);

-- Nếu dòng disable RLS báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

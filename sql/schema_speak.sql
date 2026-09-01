-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Thêm cho tính năng "Nói điều con muốn nói" (trang hocnoitienganh.html)

-- Cho vocab tự chọn của học sinh: gắn với 1 học sinh cụ thể, kèm câu ngữ cảnh + lịch ôn riêng
alter table game_vocab add column if not exists owner_student_id uuid references game_students(id);
alter table game_vocab add column if not exists lemma text;
alter table game_vocab add column if not exists example_sentence_en text;
alter table game_vocab add column if not exists example_sentence_vi text;
alter table game_vocab add column if not exists next_review_at timestamptz;
alter table game_vocab add column if not exists review_count int not null default 0;
alter table game_vocab add column if not exists correct_count int not null default 0;
alter table game_vocab add column if not exists incorrect_count int not null default 0;

-- Câu tiếng Anh học sinh tự tạo ra (từ điều các em muốn nói)
create table if not exists game_own_sentences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references game_students(id),
  vietnamese text not null,
  english text not null,
  is_saved boolean not null default false,
  interest_tags text[],
  listen_count int not null default 0,
  slow_listen_count int not null default 0,
  speak_attempt_count int not null default 0,
  review_count int not null default 0,
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);

alter table game_own_sentences disable row level security;

-- Log sự kiện cho tab admin xem lịch sử (mục 41 đặc tả)
create table if not exists game_speak_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references game_students(id),
  event_type text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table game_speak_events disable row level security;

-- Nếu 2 dòng "disable row level security" ở trên báo lỗi 42501, chạy lại riêng từng dòng đó
-- trong 1 query mới (lỗi này hay gặp với bảng mới trong project này).

-- Thêm 2026-09-01: lưu URL âm thanh (Google TTS, tạo qua Edge Function generate-audio) cho câu tự lưu,
-- để không phải tạo lại âm thanh mỗi lần nghe. Cột này ADD MỚI so với lần chạy trước — chạy lại cả file
-- này vẫn an toàn (mọi câu lệnh đều có "if not exists").
alter table game_own_sentences add column if not exists audio_en_url text;

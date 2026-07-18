-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bảng "Mẫu câu" — câu ví dụ theo Unit, tách riêng khỏi Từ vựng (game_vocab)
-- để các dạng bài (Quiz, Đánh máy...) không trộn lẫn từ đơn và câu dài.

create table if not exists game_sentences (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  sentence_en text not null,
  phonetic text,
  meaning_vi text not null,
  audio_en_url text,
  created_at timestamptz not null default now()
);

alter table game_sentences disable row level security;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

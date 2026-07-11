-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Bảng câu hỏi cho dạng bài "Kiểm tra nói": câu hỏi tạo âm thanh cho học sinh
-- nghe, câu trả lời mẫu hiển thị trên màn hình (không tạo âm thanh).

create table if not exists game_speaking_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id text not null,
  sort_order int not null default 0,
  question_en text not null,
  answer_en text not null,
  image_url text,
  audio_question_url text,
  created_at timestamptz not null default now()
);

alter table game_speaking_questions disable row level security;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này).

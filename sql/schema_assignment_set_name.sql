-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép giao bài nhắm đúng 1 bài cụ thể (set_name) trong các dạng có nhiều bài riêng
-- (Trắc nghiệm ngữ pháp, Viết câu trả lời, Nối câu, Điền từ vào chỗ trống, Đọc/Nghe theo ảnh).

alter table game_assignments add column if not exists set_name text;
alter table game_quiz_attempts add column if not exists set_name text;

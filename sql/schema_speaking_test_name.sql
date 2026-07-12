-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép 1 Unit có nhiều "Đề" Kiểm tra nói riêng biệt (VD "What animal is
-- this?", "Do you like...?") thay vì chỉ 1 danh sách câu hỏi duy nhất.
-- Câu hỏi đã có từ trước đều gán chung vào "Đề 1".

alter table game_speaking_questions add column if not exists test_name text not null default 'Đề 1';

-- Nếu dòng dưới báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi hay gặp với cột mới trong project này).
alter table game_speaking_questions disable row level security;

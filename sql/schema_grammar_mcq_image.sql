-- Cho phép mỗi câu trắc nghiệm đính kèm 1 ảnh riêng (VD bài "nhìn tranh chọn đáp án").

alter table game_grammar_mcq add column if not exists image_url text;

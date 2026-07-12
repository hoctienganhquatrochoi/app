-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Từ vựng và câu hỏi Kiểm tra nói đã có từ trước đều mặc định sort_order = 0
-- (trùng nhau vì lúc thêm hàng loạt chưa gán số thứ tự), nên sau khi sửa/thêm
-- ảnh cho 1 từ, thứ tự cả bảng bị xáo trộn lung tung. Chạy 2 dòng dưới 1 lần
-- để gán lại đúng thứ tự đã thêm ban đầu cho dữ liệu có sẵn.

update game_vocab v
set sort_order = sub.rn - 1
from (
  select id, row_number() over (partition by unit_id order by created_at, id) as rn
  from game_vocab
) sub
where v.id = sub.id;

update game_speaking_questions q
set sort_order = sub.rn - 1
from (
  select id, row_number() over (partition by unit_id order by created_at, id) as rn
  from game_speaking_questions
) sub
where q.id = sub.id;

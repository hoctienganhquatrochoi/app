-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép mỗi Nhóm học sinh có 1 tài khoản đăng nhập riêng cho giáo viên phụ trách
-- (trang teacher.html) để xem kết quả học tập của nhóm đó mà không cần vào admin.

alter table game_teaching_groups add column if not exists teacher_username text;
alter table game_teaching_groups add column if not exists teacher_password text;

create unique index if not exists game_teaching_groups_teacher_username_idx
  on game_teaching_groups(teacher_username) where teacher_username is not null;

-- Nếu dòng index ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới.

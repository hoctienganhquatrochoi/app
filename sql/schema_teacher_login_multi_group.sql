-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Cho phép 1 tài khoản giáo viên (teacher_username/teacher_password) được dùng
-- chung cho NHIỀU nhóm học sinh, để giáo viên đăng nhập 1 lần rồi chọn lớp
-- muốn xem trong trang teacher.html, thay vì mỗi lớp phải có 1 tài khoản riêng.

drop index if exists game_teaching_groups_teacher_username_idx;

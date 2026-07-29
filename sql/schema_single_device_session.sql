-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Giới hạn học sinh chỉ đăng nhập được trên 1 thiết bị tại 1 thời điểm (áp dụng cho trang Toán).
-- Khi đăng nhập ở thiết bị mới, thiết bị cũ sẽ tự động bị đăng xuất.

alter table game_students add column if not exists active_device_id text;
alter table game_students add column if not exists active_session_at timestamptz;

-- Chạy thêm trong Supabase SQL Editor sau schema_unit_settings.sql
-- Thêm cột lưu thứ tự hiển thị dạng bài cho từng Unit (để dùng nút mũi tên lên/xuống trong admin)

alter table game_unit_settings add column if not exists activity_order jsonb;

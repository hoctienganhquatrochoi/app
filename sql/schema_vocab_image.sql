-- Chạy thêm trong Supabase SQL Editor (sau khi đã có game_vocab)
alter table game_vocab add column if not exists image_url text;

-- Sau khi chạy xong, vào Storage > New bucket:
--   Tên bucket: vocab-images
--   Public bucket: BẬT
--   (Allowed MIME types có thể để image/jpeg, image/png, image/webp)

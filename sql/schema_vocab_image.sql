-- Chạy thêm trong Supabase SQL Editor (sau khi đã có game_vocab)
alter table game_vocab add column if not exists image_url text;

-- Sau khi chạy xong, vào Storage > New bucket:
--   Tên bucket: vocab-images
--   Public bucket: BẬT
--   (Allowed MIME types có thể để image/jpeg, image/png, image/webp)

-- Cho phép admin (dùng anon key trên trình duyệt) upload/ghi đè ảnh vào đúng bucket vocab-images
-- (khác với âm thanh, ảnh không đi qua Edge Function nên cần policy này mới ghi được)
create policy "Public insert to vocab-images"
on storage.objects for insert
to public
with check (bucket_id = 'vocab-images');

create policy "Public update to vocab-images"
on storage.objects for update
to public
using (bucket_id = 'vocab-images');

-- Cần thêm quyền đọc để "ghi đè ảnh cũ" (upsert) hoạt động — Storage cần kiểm tra
-- file đã tồn tại chưa trước khi ghi đè, việc này đòi hỏi SELECT chứ không chỉ INSERT/UPDATE
create policy "Public select from vocab-images"
on storage.objects for select
to public
using (bucket_id = 'vocab-images');

-- Chạy trong Supabase SQL Editor (project english-for-kids)
-- Lưu mật khẩu trang quản trị (admin/index.html). Đây chỉ là chặn đơn giản ở
-- phía trình duyệt, không phải bảo mật thật sự (trang là web tĩnh, không có
-- server riêng) — chỉ ngăn người vô tình bấm nhầm vào link admin.

create table if not exists game_admin_settings (
  id int primary key default 1,
  password text not null,
  updated_at timestamptz not null default now()
);

alter table game_admin_settings disable row level security;

-- Nếu dòng disable ở trên báo lỗi 42501, chạy lại riêng dòng đó trong 1 query mới
-- (lỗi này hay gặp với bảng mới trong project này), rồi chạy tiếp phần insert bên dưới.

-- Đổi 'DOI_MAT_KHAU_NAY' thành mật khẩu bạn muốn dùng trước khi chạy dòng dưới đây.
insert into game_admin_settings (id, password) values (1, 'DOI_MAT_KHAU_NAY')
on conflict (id) do update set password = excluded.password;

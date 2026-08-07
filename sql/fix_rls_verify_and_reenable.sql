-- Bước 1: kiểm tra xem RLS có đang thực sự BẬT trên các bảng nội dung hay không.
-- rowsecurity = false nghĩa là RLS đã tắt (hoặc chưa từng bật thành công) -> ai có anon key cũng ghi/xóa được.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
  'game_chapters','game_classes','game_grammar_dragfill','game_grammar_matching',
  'game_grammar_mcq','game_grammar_typing','game_math_dragfill','game_photo_quiz_questions',
  'game_photo_quiz_sets','game_sentences','game_speaking_questions','game_subjects',
  'game_test_sections','game_tests','game_text_dragfill','game_unit_settings',
  'game_units','game_vocab','game_wordwall_activities','game_wordwall_photos',
  'game_wordwall_template_items','game_wordwall_templates'
)
order by relrowsecurity, table_name;

-- Bước 2: bật lại RLS cho tất cả (an toàn để chạy lại nhiều lần, không ảnh hưởng dữ liệu).
-- Nếu dòng nào báo lỗi 42501, chạy lại RIÊNG dòng đó trong 1 query mới (lỗi hay gặp với project này).
alter table game_chapters enable row level security;
alter table game_classes enable row level security;
alter table game_grammar_dragfill enable row level security;
alter table game_grammar_matching enable row level security;
alter table game_grammar_mcq enable row level security;
alter table game_grammar_typing enable row level security;
alter table game_math_dragfill enable row level security;
alter table game_photo_quiz_questions enable row level security;
alter table game_photo_quiz_sets enable row level security;
alter table game_sentences enable row level security;
alter table game_speaking_questions enable row level security;
alter table game_subjects enable row level security;
alter table game_test_sections enable row level security;
alter table game_tests enable row level security;
alter table game_text_dragfill enable row level security;
alter table game_unit_settings enable row level security;
alter table game_units enable row level security;
alter table game_vocab enable row level security;
alter table game_wordwall_activities enable row level security;
alter table game_wordwall_photos enable row level security;
alter table game_wordwall_template_items enable row level security;
alter table game_wordwall_templates enable row level security;

-- Bước 3: chạy lại select ở Bước 1 để xác nhận tất cả đều rls_enabled = true.

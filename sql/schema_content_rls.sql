-- Chay trong Supabase SQL Editor (project english-for-kids)
-- Bat RLS cho cac bang noi dung: ai cung xem duoc (hoc sinh, khach), nhung chi
-- tai khoan admin da dang nhap that (qua Supabase Auth) moi duoc sua/them/xoa.
-- Dieu kien nay hoat dong dung vi CHI CO 1 tai khoan Supabase Auth duy nhat (admin);
-- hoc sinh/giao vien van dang nhap kieu rieng (khong qua Supabase Auth) nen khong
-- co auth.role() = 'authenticated', chi admin that su dang nhap moi co.

alter table game_chapters enable row level security;
drop policy if exists "public read" on game_chapters;
create policy "public read" on game_chapters for select using (true);
drop policy if exists "admin insert" on game_chapters;
create policy "admin insert" on game_chapters for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_chapters;
create policy "admin update" on game_chapters for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_chapters;
create policy "admin delete" on game_chapters for delete using (auth.role() = 'authenticated');

alter table game_classes enable row level security;
drop policy if exists "public read" on game_classes;
create policy "public read" on game_classes for select using (true);
drop policy if exists "admin insert" on game_classes;
create policy "admin insert" on game_classes for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_classes;
create policy "admin update" on game_classes for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_classes;
create policy "admin delete" on game_classes for delete using (auth.role() = 'authenticated');

alter table game_grammar_dragfill enable row level security;
drop policy if exists "public read" on game_grammar_dragfill;
create policy "public read" on game_grammar_dragfill for select using (true);
drop policy if exists "admin insert" on game_grammar_dragfill;
create policy "admin insert" on game_grammar_dragfill for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_grammar_dragfill;
create policy "admin update" on game_grammar_dragfill for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_grammar_dragfill;
create policy "admin delete" on game_grammar_dragfill for delete using (auth.role() = 'authenticated');

alter table game_grammar_matching enable row level security;
drop policy if exists "public read" on game_grammar_matching;
create policy "public read" on game_grammar_matching for select using (true);
drop policy if exists "admin insert" on game_grammar_matching;
create policy "admin insert" on game_grammar_matching for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_grammar_matching;
create policy "admin update" on game_grammar_matching for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_grammar_matching;
create policy "admin delete" on game_grammar_matching for delete using (auth.role() = 'authenticated');

alter table game_grammar_mcq enable row level security;
drop policy if exists "public read" on game_grammar_mcq;
create policy "public read" on game_grammar_mcq for select using (true);
drop policy if exists "admin insert" on game_grammar_mcq;
create policy "admin insert" on game_grammar_mcq for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_grammar_mcq;
create policy "admin update" on game_grammar_mcq for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_grammar_mcq;
create policy "admin delete" on game_grammar_mcq for delete using (auth.role() = 'authenticated');

alter table game_grammar_typing enable row level security;
drop policy if exists "public read" on game_grammar_typing;
create policy "public read" on game_grammar_typing for select using (true);
drop policy if exists "admin insert" on game_grammar_typing;
create policy "admin insert" on game_grammar_typing for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_grammar_typing;
create policy "admin update" on game_grammar_typing for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_grammar_typing;
create policy "admin delete" on game_grammar_typing for delete using (auth.role() = 'authenticated');

alter table game_math_dragfill enable row level security;
drop policy if exists "public read" on game_math_dragfill;
create policy "public read" on game_math_dragfill for select using (true);
drop policy if exists "admin insert" on game_math_dragfill;
create policy "admin insert" on game_math_dragfill for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_math_dragfill;
create policy "admin update" on game_math_dragfill for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_math_dragfill;
create policy "admin delete" on game_math_dragfill for delete using (auth.role() = 'authenticated');

alter table game_photo_quiz_questions enable row level security;
drop policy if exists "public read" on game_photo_quiz_questions;
create policy "public read" on game_photo_quiz_questions for select using (true);
drop policy if exists "admin insert" on game_photo_quiz_questions;
create policy "admin insert" on game_photo_quiz_questions for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_photo_quiz_questions;
create policy "admin update" on game_photo_quiz_questions for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_photo_quiz_questions;
create policy "admin delete" on game_photo_quiz_questions for delete using (auth.role() = 'authenticated');

alter table game_photo_quiz_sets enable row level security;
drop policy if exists "public read" on game_photo_quiz_sets;
create policy "public read" on game_photo_quiz_sets for select using (true);
drop policy if exists "admin insert" on game_photo_quiz_sets;
create policy "admin insert" on game_photo_quiz_sets for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_photo_quiz_sets;
create policy "admin update" on game_photo_quiz_sets for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_photo_quiz_sets;
create policy "admin delete" on game_photo_quiz_sets for delete using (auth.role() = 'authenticated');

alter table game_sentences enable row level security;
drop policy if exists "public read" on game_sentences;
create policy "public read" on game_sentences for select using (true);
drop policy if exists "admin insert" on game_sentences;
create policy "admin insert" on game_sentences for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_sentences;
create policy "admin update" on game_sentences for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_sentences;
create policy "admin delete" on game_sentences for delete using (auth.role() = 'authenticated');

alter table game_speaking_questions enable row level security;
drop policy if exists "public read" on game_speaking_questions;
create policy "public read" on game_speaking_questions for select using (true);
drop policy if exists "admin insert" on game_speaking_questions;
create policy "admin insert" on game_speaking_questions for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_speaking_questions;
create policy "admin update" on game_speaking_questions for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_speaking_questions;
create policy "admin delete" on game_speaking_questions for delete using (auth.role() = 'authenticated');

alter table game_subjects enable row level security;
drop policy if exists "public read" on game_subjects;
create policy "public read" on game_subjects for select using (true);
drop policy if exists "admin insert" on game_subjects;
create policy "admin insert" on game_subjects for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_subjects;
create policy "admin update" on game_subjects for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_subjects;
create policy "admin delete" on game_subjects for delete using (auth.role() = 'authenticated');

alter table game_test_sections enable row level security;
drop policy if exists "public read" on game_test_sections;
create policy "public read" on game_test_sections for select using (true);
drop policy if exists "admin insert" on game_test_sections;
create policy "admin insert" on game_test_sections for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_test_sections;
create policy "admin update" on game_test_sections for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_test_sections;
create policy "admin delete" on game_test_sections for delete using (auth.role() = 'authenticated');

alter table game_tests enable row level security;
drop policy if exists "public read" on game_tests;
create policy "public read" on game_tests for select using (true);
drop policy if exists "admin insert" on game_tests;
create policy "admin insert" on game_tests for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_tests;
create policy "admin update" on game_tests for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_tests;
create policy "admin delete" on game_tests for delete using (auth.role() = 'authenticated');

alter table game_text_dragfill enable row level security;
drop policy if exists "public read" on game_text_dragfill;
create policy "public read" on game_text_dragfill for select using (true);
drop policy if exists "admin insert" on game_text_dragfill;
create policy "admin insert" on game_text_dragfill for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_text_dragfill;
create policy "admin update" on game_text_dragfill for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_text_dragfill;
create policy "admin delete" on game_text_dragfill for delete using (auth.role() = 'authenticated');

alter table game_unit_settings enable row level security;
drop policy if exists "public read" on game_unit_settings;
create policy "public read" on game_unit_settings for select using (true);
drop policy if exists "admin insert" on game_unit_settings;
create policy "admin insert" on game_unit_settings for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_unit_settings;
create policy "admin update" on game_unit_settings for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_unit_settings;
create policy "admin delete" on game_unit_settings for delete using (auth.role() = 'authenticated');

alter table game_units enable row level security;
drop policy if exists "public read" on game_units;
create policy "public read" on game_units for select using (true);
drop policy if exists "admin insert" on game_units;
create policy "admin insert" on game_units for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_units;
create policy "admin update" on game_units for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_units;
create policy "admin delete" on game_units for delete using (auth.role() = 'authenticated');

alter table game_vocab enable row level security;
drop policy if exists "public read" on game_vocab;
create policy "public read" on game_vocab for select using (true);
drop policy if exists "admin insert" on game_vocab;
create policy "admin insert" on game_vocab for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_vocab;
create policy "admin update" on game_vocab for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_vocab;
create policy "admin delete" on game_vocab for delete using (auth.role() = 'authenticated');

alter table game_wordwall_activities enable row level security;
drop policy if exists "public read" on game_wordwall_activities;
create policy "public read" on game_wordwall_activities for select using (true);
drop policy if exists "admin insert" on game_wordwall_activities;
create policy "admin insert" on game_wordwall_activities for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_wordwall_activities;
create policy "admin update" on game_wordwall_activities for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_wordwall_activities;
create policy "admin delete" on game_wordwall_activities for delete using (auth.role() = 'authenticated');

alter table game_wordwall_photos enable row level security;
drop policy if exists "public read" on game_wordwall_photos;
create policy "public read" on game_wordwall_photos for select using (true);
drop policy if exists "admin insert" on game_wordwall_photos;
create policy "admin insert" on game_wordwall_photos for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_wordwall_photos;
create policy "admin update" on game_wordwall_photos for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_wordwall_photos;
create policy "admin delete" on game_wordwall_photos for delete using (auth.role() = 'authenticated');

alter table game_wordwall_template_items enable row level security;
drop policy if exists "public read" on game_wordwall_template_items;
create policy "public read" on game_wordwall_template_items for select using (true);
drop policy if exists "admin insert" on game_wordwall_template_items;
create policy "admin insert" on game_wordwall_template_items for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_wordwall_template_items;
create policy "admin update" on game_wordwall_template_items for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_wordwall_template_items;
create policy "admin delete" on game_wordwall_template_items for delete using (auth.role() = 'authenticated');

alter table game_wordwall_templates enable row level security;
drop policy if exists "public read" on game_wordwall_templates;
create policy "public read" on game_wordwall_templates for select using (true);
drop policy if exists "admin insert" on game_wordwall_templates;
create policy "admin insert" on game_wordwall_templates for insert with check (auth.role() = 'authenticated');
drop policy if exists "admin update" on game_wordwall_templates;
create policy "admin update" on game_wordwall_templates for update using (auth.role() = 'authenticated');
drop policy if exists "admin delete" on game_wordwall_templates;
create policy "admin delete" on game_wordwall_templates for delete using (auth.role() = 'authenticated');

-- Neu dong enable RLS bao loi 42501, chay lai rieng dong do trong 1 query moi.
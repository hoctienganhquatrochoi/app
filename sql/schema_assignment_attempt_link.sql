alter table game_quiz_attempts add column if not exists assignment_id uuid references game_assignments(id) on delete set null;

alter table game_quiz_attempts disable row level security;

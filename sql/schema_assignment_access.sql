create table if not exists game_assignment_access (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references game_assignments(id) on delete cascade,
  student_id uuid not null references game_students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table game_assignment_access disable row level security;

-- Ejecuta este script en Supabase: SQL Editor > New query > Run.
-- No elimina datos: crea solo las tablas, índices y políticas que falten.

create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'finished'))
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 30),
  score integer not null default 0 check (score >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  theme_id text not null,
  activity_id text not null,
  activity_type text not null,
  level smallint not null check (level between 1 and 3),
  initial_level smallint not null default 1 check (initial_level between 1 and 3),
  resolved_level smallint not null check (resolved_level between 1 and 3),
  is_correct boolean not null,
  points smallint not null check (points in (0, 6, 8, 10)),
  selected_answer jsonb,
  justification text,
  answered_at timestamptz not null default now()
);

create index if not exists attempts_session_id_idx on public.attempts(session_id);
create index if not exists attempts_student_id_idx on public.attempts(student_id);
create index if not exists attempts_theme_id_idx on public.attempts(theme_id);

alter table public.sessions enable row level security;
alter table public.students enable row level security;
alter table public.attempts enable row level security;

revoke all on public.sessions, public.students, public.attempts from anon, authenticated;
grant insert on public.sessions, public.students, public.attempts to anon;
grant select on public.sessions, public.students, public.attempts to authenticated;

drop policy if exists "anon puede crear sesiones" on public.sessions;
drop policy if exists "anon puede registrar estudiantes" on public.students;
drop policy if exists "anon puede registrar intentos" on public.attempts;
drop policy if exists "dashboard autenticado puede consultar sesiones" on public.sessions;
drop policy if exists "dashboard autenticado puede consultar estudiantes" on public.students;
drop policy if exists "dashboard autenticado puede consultar intentos" on public.attempts;

create policy "anon puede crear sesiones" on public.sessions
  for insert to anon with check (status = 'active');
create policy "anon puede registrar estudiantes" on public.students
  for insert to anon with check (name = btrim(name) and char_length(name) between 2 and 30);
create policy "anon puede registrar intentos" on public.attempts
  for insert to anon with check (level between 1 and 3 and initial_level = 1 and resolved_level between 1 and 3 and points in (0, 6, 8, 10));
create policy "dashboard autenticado puede consultar sesiones" on public.sessions
  for select to authenticated using (true);
create policy "dashboard autenticado puede consultar estudiantes" on public.students
  for select to authenticated using (true);
create policy "dashboard autenticado puede consultar intentos" on public.attempts
  for select to authenticated using (true);

-- Solicita que la API REST de Supabase reconozca inmediatamente el esquema.
notify pgrst, 'reload schema';

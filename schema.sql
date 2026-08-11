-- ============================================================
-- Esquema SQL para Supabase (PostgreSQL)
-- App de sensibilización activa y respuesta coordinada
-- ============================================================
-- Cómo usar:
--   1. Crea un proyecto en supabase.com
--   2. Ve a SQL Editor > New query
--   3. Pega este archivo completo y ejecuta (Run)
-- ============================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type cause_status as enum ('abierta', 'en_progreso', 'cubierta', 'cerrada');
create type skill_category as enum (
  'tecnica',
  'logistica',
  'salud',
  'emocional',
  'creativa',
  'administrativa',
  'otra'
);

-- ------------------------------------------------------------
-- USERS
-- Nota: usamos el mismo id que auth.users de Supabase para
-- vincular el perfil con el usuario autenticado.
-- ------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text unique not null,
  location text,
  has_vehicle boolean default false,
  weekly_availability_hours int default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SKILLS (catálogo maestro de habilidades)
-- ------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category skill_category not null default 'otra'
);

-- ------------------------------------------------------------
-- USER_SKILLS (relación N:N usuario <-> habilidad)
-- ------------------------------------------------------------
create table public.user_skills (
  user_id uuid not null references public.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (user_id, skill_id)
);

-- ------------------------------------------------------------
-- CAUSES (emergencias / causas verificadas)
-- ------------------------------------------------------------
create table public.causes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  human_story text not null,
  location text not null,
  image_url text,
  verified_by text not null,
  status cause_status not null default 'abierta',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- NEED_SKILLS (habilidades requeridas por cada causa)
-- ------------------------------------------------------------
create table public.need_skills (
  cause_id uuid not null references public.causes (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  quantity_needed int not null default 1,
  primary key (cause_id, skill_id)
);

-- ------------------------------------------------------------
-- IMPACT_UPDATES (feed de transparencia / "el después")
-- ------------------------------------------------------------
create table public.impact_updates (
  id uuid primary key default gen_random_uuid(),
  cause_id uuid not null references public.causes (id) on delete cascade,
  update_text text not null,
  image_url text,
  date timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES ÚTILES
-- ------------------------------------------------------------
create index idx_causes_status on public.causes (status);
create index idx_need_skills_skill on public.need_skills (skill_id);
create index idx_impact_updates_cause on public.impact_updates (cause_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Ajusta las políticas según cómo autentiques a tus usuarios.
-- ------------------------------------------------------------
alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.causes enable row level security;
alter table public.need_skills enable row level security;
alter table public.impact_updates enable row level security;

-- Lectura pública de catálogos y causas (contenido de sensibilización)
create policy "skills_public_read" on public.skills for select using (true);
create policy "causes_public_read" on public.causes for select using (true);
create policy "need_skills_public_read" on public.need_skills for select using (true);
create policy "impact_updates_public_read" on public.impact_updates for select using (true);

-- Un usuario solo puede leer/editar su propio perfil
create policy "users_read_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Un usuario solo administra sus propias habilidades seleccionadas
create policy "user_skills_read_own" on public.user_skills
  for select using (auth.uid() = user_id);
create policy "user_skills_write_own" on public.user_skills
  for insert with check (auth.uid() = user_id);
create policy "user_skills_delete_own" on public.user_skills
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- SEED opcional: catálogo inicial de habilidades
-- ------------------------------------------------------------
insert into public.skills (name, category) values
  ('Primeros auxilios', 'salud'),
  ('Logística y transporte', 'logistica'),
  ('Cocina comunitaria', 'logistica'),
  ('Programación', 'tecnica'),
  ('Contención emocional', 'emocional'),
  ('Carpintería', 'tecnica'),
  ('Enfermería', 'salud'),
  ('Traducción / idiomas', 'administrativa'),
  ('Fotografía y comunicación', 'creativa'),
  ('Gestión de donaciones', 'administrativa')
on conflict (name) do nothing;

-- =============================================================
-- Mis Recetas — sección "Trucos" de cocina
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================
--
-- Trucos cortos de cocina (afilar un cuchillo, escaldar tomates,
-- desalar bacalao...) sin ingredientes ni pasos formales: solo
-- título, notas en texto libre y, opcionalmente, imagen, vídeo y
-- enlace a la fuente.
--
-- Las imágenes reutilizan el bucket "recipe-images" (las RLS de ese
-- bucket exigen que el primer nivel del path sea el household_id;
-- los trucos se subirán a {household_id}/tricks/...).

create table if not exists tricks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  notes text,
  image_url text,
  video_url text,
  source_url text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tricks_household_idx on tricks(household_id);
create index if not exists tricks_title_idx on tricks (lower(title));

create trigger tricks_set_updated_at
  before update on tricks
  for each row execute function set_updated_at();

alter table tricks enable row level security;

create policy tricks_household on tricks for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

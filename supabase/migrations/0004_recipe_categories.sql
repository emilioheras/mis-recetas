-- =============================================================
-- Mis Recetas — categorías personalizadas de recetas
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================
--
-- Cada hogar tiene su propia lista de categorías ("Ensaladas",
-- "Cremas y sopas", "Navidad", "Orientales"...). Una receta puede
-- estar en varias categorías a la vez (sin tope) — son una segunda
-- dimensión de clasificación, complementaria al "ingrediente
-- principal" (estrella) que ya existe.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (household_id, normalized_name)
);
create index if not exists categories_household_idx on categories(household_id);

create table if not exists recipe_categories (
  recipe_id uuid not null references recipes(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  position smallint not null default 0,
  primary key (recipe_id, category_id)
);
create index if not exists recipe_categories_category_idx
  on recipe_categories(category_id);

alter table categories enable row level security;
alter table recipe_categories enable row level security;

create policy categories_household on categories for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy recipe_categories_household on recipe_categories for all
  using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and r.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_id and r.household_id = current_household_id()
    )
  );

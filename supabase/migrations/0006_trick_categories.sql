-- =============================================================
-- Mis Recetas — categorías personalizadas de trucos
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================
--
-- Cada hogar tiene su propia lista de categorías de trucos,
-- INDEPENDIENTE de las categorías de recetas. Replicamos el
-- modelo de recetas (tabla `categories` + tabla puente
-- `recipe_categories`) en dos tablas paralelas:
--
--   trick_categories       -> categorías propias de trucos
--   trick_category_links   -> tabla puente truco ↔ categoría
--
-- Un truco puede estar en varias categorías a la vez (sin tope).

create table if not exists trick_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (household_id, normalized_name)
);
create index if not exists trick_categories_household_idx
  on trick_categories(household_id);

create table if not exists trick_category_links (
  trick_id uuid not null references tricks(id) on delete cascade,
  category_id uuid not null references trick_categories(id) on delete cascade,
  position smallint not null default 0,
  primary key (trick_id, category_id)
);
create index if not exists trick_category_links_category_idx
  on trick_category_links(category_id);

alter table trick_categories enable row level security;
alter table trick_category_links enable row level security;

create policy trick_categories_household on trick_categories for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy trick_category_links_household on trick_category_links for all
  using (
    exists (
      select 1 from tricks t
      where t.id = trick_id and t.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from tricks t
      where t.id = trick_id and t.household_id = current_household_id()
    )
  );

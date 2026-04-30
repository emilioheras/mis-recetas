-- =============================================================
-- Mis Recetas — flag "despensa" en ingredientes
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================

-- Marca un ingrediente como "ya lo tengo en casa" (sal, aceite,
-- pimienta...). En la lista de la compra estos no aparecen junto
-- a los del super, sino agrupados aparte como "Ya en tu despensa",
-- con sus cantidades, para que sepas cuánto vas a usar.
alter table ingredients
  add column if not exists is_pantry boolean not null default false;

-- Indice opcional: la lista de la compra hace SELECT por household_id
-- y filtra por is_pantry; con pocos ingredientes en una BBDD pequeña
-- no haria falta, lo dejamos por previsión.
create index if not exists ingredients_is_pantry_idx
  on ingredients(household_id, is_pantry);

-- =============================================================
-- Mis Recetas — esquema inicial
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Enumerados ---------------------------------------

create type source_type as enum ('manual', 'url', 'markdown', 'youtube', 'pdf');
create type ingredient_category as enum (
  'verdura', 'fruta', 'pescado', 'carne', 'lacteo', 'cereal',
  'legumbre', 'huevo', 'condimento', 'bebida', 'otro'
);
create type unit_type as enum (
  'g', 'kg', 'ml', 'l', 'ud', 'cdta', 'cda', 'taza', 'pizca', 'al_gusto'
);
create type meal_type as enum ('comida', 'cena');
create type import_status as enum ('pending', 'processing', 'done', 'error');
create type user_role as enum ('owner', 'member');

-- ---------- Hogares y usuarios -------------------------------

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_servings smallint not null default 2 check (default_servings between 1 and 20),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  household_id uuid not null references households(id) on delete cascade,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);
create index users_household_idx on users(household_id);

create table allowed_emails (
  email text primary key,
  household_id uuid not null references households(id) on delete cascade,
  invited_at timestamptz not null default now()
);

-- Cuando alguien se registra en auth.users, si su email está en allowed_emails
-- creamos automáticamente la fila correspondiente en public.users.
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from allowed_emails where email = new.email;

  if v_household_id is null then
    raise exception 'Email % no está autorizado', new.email;
  end if;

  insert into users (id, email, household_id)
  values (new.id, new.email, v_household_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Helper: hogar del usuario autenticado actual
create or replace function current_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from users where id = auth.uid();
$$;

-- ---------- Ingredientes y temporada -------------------------

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  category ingredient_category not null default 'otro',
  created_at timestamptz not null default now(),
  unique (household_id, normalized_name)
);
create index ingredients_household_idx on ingredients(household_id);

create table ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  alias text not null,
  unique (ingredient_id, alias)
);

create table seasonal_calendar (
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  peak boolean not null default false,
  primary key (ingredient_id, month)
);

-- ---------- Recetas ------------------------------------------

create table recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  source_type source_type not null default 'manual',
  source_url text,
  video_url text,
  pdf_url text,
  servings smallint not null default 2 check (servings between 1 and 20),
  prep_minutes smallint,
  instructions_md text,
  main_ingredient_id uuid references ingredients(id) on delete set null,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_household_idx on recipes(household_id);
create index recipes_main_ingredient_idx on recipes(main_ingredient_id);
create index recipes_title_idx on recipes (lower(title));

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric(10, 2),
  unit unit_type not null default 'al_gusto',
  is_main boolean not null default false,
  notes text,
  position smallint not null default 0
);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);
create index recipe_ingredients_ingredient_idx on recipe_ingredients(ingredient_id);

-- ---------- Menú semanal -------------------------------------

create table weekly_menus (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start_date date not null,
  servings smallint not null default 2 check (servings between 1 and 20),
  created_at timestamptz not null default now(),
  unique (household_id, week_start_date)
);

create table weekly_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references weekly_menus(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=lunes
  meal meal_type not null default 'comida',
  unique (menu_id, day_of_week, meal)
);

-- ---------- Lista de la compra -------------------------------

create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null unique references weekly_menus(id) on delete cascade,
  generated_at timestamptz not null default now()
);

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shopping_lists(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  total_quantity numeric(10, 2),
  unit unit_type not null,
  checked boolean not null default false,
  notes text
);
create index shopping_list_items_list_idx on shopping_list_items(list_id);

-- ---------- Trabajos de importación --------------------------

create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  source_type source_type not null,
  source_data jsonb not null,
  status import_status not null default 'pending',
  result_recipe_id uuid references recipes(id) on delete set null,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index import_jobs_household_idx on import_jobs(household_id, status);

-- ---------- Trigger updated_at -------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

-- ---------- Row-Level Security -------------------------------

alter table households enable row level security;
alter table users enable row level security;
alter table allowed_emails enable row level security;
alter table ingredients enable row level security;
alter table ingredient_aliases enable row level security;
alter table seasonal_calendar enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table weekly_menus enable row level security;
alter table weekly_menu_items enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_list_items enable row level security;
alter table import_jobs enable row level security;

-- households: el usuario solo ve su hogar
create policy households_self on households
  for select using (id = current_household_id());

-- users: ves a los miembros de tu hogar
create policy users_self on users
  for select using (household_id = current_household_id());

-- allowed_emails: solo el owner puede gestionarla (vía service_role)
-- (sin política para anon/authenticated → bloqueado por defecto)

-- Plantilla genérica: todas las tablas con household_id se filtran por el hogar actual
create policy ingredients_household on ingredients for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy recipes_household on recipes for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy weekly_menus_household on weekly_menus for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy import_jobs_household on import_jobs for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

-- Tablas hijas: vía join con la tabla padre
create policy ingredient_aliases_household on ingredient_aliases for all
  using (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_id and i.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_id and i.household_id = current_household_id()
    )
  );

create policy seasonal_calendar_household on seasonal_calendar for all
  using (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_id and i.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from ingredients i
      where i.id = ingredient_id and i.household_id = current_household_id()
    )
  );

create policy recipe_ingredients_household on recipe_ingredients for all
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

create policy weekly_menu_items_household on weekly_menu_items for all
  using (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_id and m.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_id and m.household_id = current_household_id()
    )
  );

create policy shopping_lists_household on shopping_lists for all
  using (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_id and m.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_id and m.household_id = current_household_id()
    )
  );

create policy shopping_list_items_household on shopping_list_items for all
  using (
    exists (
      select 1 from shopping_lists sl
      join weekly_menus m on m.id = sl.menu_id
      where sl.id = list_id and m.household_id = current_household_id()
    )
  )
  with check (
    exists (
      select 1 from shopping_lists sl
      join weekly_menus m on m.id = sl.menu_id
      where sl.id = list_id and m.household_id = current_household_id()
    )
  );

-- ---------- Storage bucket para PDFs -------------------------

insert into storage.buckets (id, name, public)
values ('recipe-pdfs', 'recipe-pdfs', false)
on conflict (id) do nothing;

create policy "PDFs visibles por miembros del hogar" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recipe-pdfs'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

create policy "PDFs subidos por miembros del hogar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-pdfs'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

create policy "PDFs borrables por miembros del hogar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-pdfs'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

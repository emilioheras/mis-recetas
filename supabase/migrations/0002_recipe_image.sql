-- =============================================================
-- Mis Recetas — añade imagen de portada a las recetas
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- =============================================================

-- Columna para guardar la ruta de la imagen en Storage.
alter table recipes
  add column if not exists image_url text;

-- Bucket privado para imágenes (el patrón de RLS por carpeta = household_id
-- es el mismo que usamos con recipe-pdfs).
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

create policy "Imagenes visibles por miembros del hogar" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

create policy "Imagenes subidas por miembros del hogar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

create policy "Imagenes borrables por miembros del hogar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = current_household_id()::text
  );

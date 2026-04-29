-- =============================================================
-- Mis Recetas — calendario de temporada (España)
-- Catálogo global, compartido por todos los hogares.
-- Los nombres están "normalizados": minúsculas, sin tildes, singular.
-- =============================================================

create table seasonal_reference (
  normalized_name text not null,
  month smallint not null check (month between 1 and 12),
  peak boolean not null default false,
  primary key (normalized_name, month)
);

alter table seasonal_reference enable row level security;
create policy seasonal_reference_read on seasonal_reference
  for select using (true);

insert into seasonal_reference (normalized_name, month, peak) values
  -- ============== VERDURAS ==============
  -- ACELGA
  ('acelga', 1, false), ('acelga', 2, false), ('acelga', 3, true),
  ('acelga', 4, true),  ('acelga', 5, false), ('acelga', 10, false),
  ('acelga', 11, true), ('acelga', 12, true),
  -- AJO TIERNO
  ('ajo tierno', 4, false), ('ajo tierno', 5, true), ('ajo tierno', 6, false),
  -- ALCACHOFA
  ('alcachofa', 1, true), ('alcachofa', 2, true), ('alcachofa', 3, false),
  ('alcachofa', 4, false), ('alcachofa', 11, false), ('alcachofa', 12, true),
  -- BERENJENA
  ('berenjena', 6, false), ('berenjena', 7, true), ('berenjena', 8, true),
  ('berenjena', 9, false),
  -- BONIATO
  ('boniato', 9, false), ('boniato', 10, false),
  ('boniato', 11, true), ('boniato', 12, true),
  -- BRÓCOLI → brocoli
  ('brocoli', 1, true), ('brocoli', 2, true), ('brocoli', 3, false),
  ('brocoli', 4, false), ('brocoli', 10, false),
  ('brocoli', 11, true), ('brocoli', 12, true),
  -- CALABACÍN → calabacin
  ('calabacin', 5, false), ('calabacin', 6, true),
  ('calabacin', 7, true), ('calabacin', 8, true), ('calabacin', 9, false),
  -- CALABAZA
  ('calabaza', 9, false), ('calabaza', 10, true), ('calabaza', 11, true),
  ('calabaza', 12, false), ('calabaza', 1, false), ('calabaza', 2, false),
  -- CARDO
  ('cardo', 11, false), ('cardo', 12, true), ('cardo', 1, true), ('cardo', 2, false),
  -- COLIFLOR
  ('coliflor', 1, true), ('coliflor', 2, true), ('coliflor', 3, false),
  ('coliflor', 4, false), ('coliflor', 10, false),
  ('coliflor', 11, true), ('coliflor', 12, true),
  -- ENDIVIA
  ('endivia', 1, true), ('endivia', 2, false),
  ('endivia', 11, false), ('endivia', 12, true),
  -- ESCAROLA
  ('escarola', 1, false), ('escarola', 2, false),
  ('escarola', 11, true), ('escarola', 12, true),
  -- ESPÁRRAGO → esparrago
  ('esparrago', 3, false), ('esparrago', 4, true),
  ('esparrago', 5, true), ('esparrago', 6, false),
  -- ESPINACA
  ('espinaca', 1, true), ('espinaca', 2, true), ('espinaca', 3, false),
  ('espinaca', 4, false), ('espinaca', 10, false),
  ('espinaca', 11, true), ('espinaca', 12, true),
  -- GUISANTE
  ('guisante', 3, false), ('guisante', 4, true),
  ('guisante', 5, true), ('guisante', 6, false),
  -- HABA
  ('haba', 3, false), ('haba', 4, true), ('haba', 5, true), ('haba', 6, false),
  -- JUDÍA VERDE → judia verde
  ('judia verde', 5, false), ('judia verde', 6, false),
  ('judia verde', 7, true), ('judia verde', 8, true), ('judia verde', 9, false),
  -- LECHUGA
  ('lechuga', 4, false), ('lechuga', 5, true), ('lechuga', 6, true),
  ('lechuga', 7, false), ('lechuga', 8, false), ('lechuga', 9, false),
  -- PEPINO
  ('pepino', 5, false), ('pepino', 6, false),
  ('pepino', 7, true), ('pepino', 8, true), ('pepino', 9, false),
  -- PIMIENTO
  ('pimiento', 6, false), ('pimiento', 7, true), ('pimiento', 8, true),
  ('pimiento', 9, true), ('pimiento', 10, false),
  -- PUERRO
  ('puerro', 1, true), ('puerro', 2, true), ('puerro', 3, false),
  ('puerro', 4, false), ('puerro', 10, false),
  ('puerro', 11, true), ('puerro', 12, true),
  -- RÁBANO → rabano
  ('rabano', 4, false), ('rabano', 5, true),
  ('rabano', 6, true), ('rabano', 7, false),
  -- REMOLACHA
  ('remolacha', 9, false), ('remolacha', 10, false),
  ('remolacha', 11, true), ('remolacha', 12, true),
  ('remolacha', 1, false), ('remolacha', 2, false),
  -- REPOLLO
  ('repollo', 1, true), ('repollo', 2, false), ('repollo', 3, false),
  ('repollo', 11, false), ('repollo', 12, true),
  -- TOMATE
  ('tomate', 5, false), ('tomate', 6, false),
  ('tomate', 7, true), ('tomate', 8, true),
  ('tomate', 9, false), ('tomate', 10, false),
  -- ZANAHORIA
  ('zanahoria', 9, false), ('zanahoria', 10, true),
  ('zanahoria', 11, true), ('zanahoria', 12, false),
  ('zanahoria', 1, false), ('zanahoria', 2, false),

  -- ============== FRUTAS ==============
  -- AGUACATE
  ('aguacate', 1, true), ('aguacate', 2, true), ('aguacate', 3, false),
  ('aguacate', 4, false), ('aguacate', 11, false), ('aguacate', 12, true),
  -- ALBARICOQUE
  ('albaricoque', 5, false), ('albaricoque', 6, true), ('albaricoque', 7, true),
  -- CAQUI
  ('caqui', 10, true), ('caqui', 11, true),
  ('caqui', 12, false), ('caqui', 1, false),
  -- CASTAÑA → castana
  ('castana', 10, true), ('castana', 11, true), ('castana', 12, false),
  -- CEREZA
  ('cereza', 5, false), ('cereza', 6, true), ('cereza', 7, false),
  -- CIRUELA
  ('ciruela', 6, false), ('ciruela', 7, true),
  ('ciruela', 8, true), ('ciruela', 9, false),
  -- FRESA
  ('fresa', 3, false), ('fresa', 4, true),
  ('fresa', 5, true), ('fresa', 6, false),
  -- GRANADA
  ('granada', 9, false), ('granada', 10, true),
  ('granada', 11, true), ('granada', 12, false),
  -- HIGO
  ('higo', 7, false), ('higo', 8, true),
  ('higo', 9, true), ('higo', 10, false),
  -- KIWI
  ('kiwi', 11, false), ('kiwi', 12, true),
  ('kiwi', 1, true), ('kiwi', 2, true), ('kiwi', 3, false),
  -- LIMÓN → limon
  ('limon', 10, false), ('limon', 11, false), ('limon', 12, false),
  ('limon', 1, true), ('limon', 2, true), ('limon', 3, true),
  ('limon', 4, true), ('limon', 5, false),
  -- MANDARINA
  ('mandarina', 10, false), ('mandarina', 11, true),
  ('mandarina', 12, true), ('mandarina', 1, true),
  ('mandarina', 2, false), ('mandarina', 3, false),
  -- MANZANA
  ('manzana', 9, true), ('manzana', 10, true), ('manzana', 11, true),
  ('manzana', 12, false), ('manzana', 1, false), ('manzana', 2, false),
  -- MELOCOTÓN → melocoton
  ('melocoton', 6, false), ('melocoton', 7, true),
  ('melocoton', 8, true), ('melocoton', 9, false),
  -- MELÓN → melon
  ('melon', 5, false), ('melon', 6, false),
  ('melon', 7, true), ('melon', 8, true), ('melon', 9, false),
  -- MEMBRILLO
  ('membrillo', 9, false), ('membrillo', 10, true), ('membrillo', 11, false),
  -- NARANJA
  ('naranja', 11, false), ('naranja', 12, true), ('naranja', 1, true),
  ('naranja', 2, true), ('naranja', 3, true), ('naranja', 4, false),
  -- NECTARINA
  ('nectarina', 6, false), ('nectarina', 7, true),
  ('nectarina', 8, true), ('nectarina', 9, false),
  -- NÍSPERO → nispero
  ('nispero', 4, false), ('nispero', 5, true), ('nispero', 6, false),
  -- PARAGUAYO
  ('paraguayo', 6, false), ('paraguayo', 7, true), ('paraguayo', 8, true),
  -- PERA
  ('pera', 7, false), ('pera', 8, false),
  ('pera', 9, true), ('pera', 10, true), ('pera', 11, true), ('pera', 12, false),
  -- POMELO
  ('pomelo', 11, false), ('pomelo', 12, false),
  ('pomelo', 1, true), ('pomelo', 2, true), ('pomelo', 3, true),
  -- SANDÍA → sandia
  ('sandia', 5, false), ('sandia', 6, false),
  ('sandia', 7, true), ('sandia', 8, true), ('sandia', 9, false),
  -- UVA
  ('uva', 8, false), ('uva', 9, true), ('uva', 10, true), ('uva', 11, false),

  -- ============== PESCADO Y MARISCO ==============
  -- ANCHOA / BOQUERÓN
  ('anchoa', 4, false), ('anchoa', 5, true), ('anchoa', 6, true),
  ('boqueron', 4, false), ('boqueron', 5, true), ('boqueron', 6, true),
  -- ATÚN → atun
  ('atun', 5, false), ('atun', 6, true), ('atun', 7, true), ('atun', 8, false),
  -- BONITO
  ('bonito', 7, false), ('bonito', 8, true), ('bonito', 9, false),
  -- CABALLA
  ('caballa', 4, false), ('caballa', 5, true),
  ('caballa', 6, true), ('caballa', 7, false),
  -- SARDINA
  ('sardina', 5, false), ('sardina', 6, true),
  ('sardina', 7, true), ('sardina', 8, false),
  -- BESUGO
  ('besugo', 11, false), ('besugo', 12, true),
  ('besugo', 1, true), ('besugo', 2, false),
  -- MEJILLON
  ('mejillon', 9, false), ('mejillon', 10, true),
  ('mejillon', 11, true), ('mejillon', 12, false);

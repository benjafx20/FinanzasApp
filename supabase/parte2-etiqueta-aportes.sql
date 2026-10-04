-- PARTE 2: agrupar ingresos/aportes con "agrupar como".
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

alter table category_fundings add column if not exists etiqueta text;
create index if not exists idx_category_fundings_etiqueta on category_fundings(etiqueta);

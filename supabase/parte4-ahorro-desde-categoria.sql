-- PARTE 4: los aportes a metas de ahorro salen del saldo de una categoría, y las
-- metas se pueden cerrar (la plata ahorrada se da por usada).
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.
-- Los aportes que ya existen quedan sin categoría de origen (no descuentan nada).

alter table savings_contributions
  add column if not exists source_category_id uuid references categories(id) on delete set null;

create index if not exists idx_savings_contributions_source on savings_contributions(source_category_id);

-- Meta cerrada: ya usaste la plata ahorrada. Sus aportes siguen descontados de las
-- categorías (la plata se gastó) y la meta ya no se puede eliminar sin reabrirla.
alter table savings_goals add column if not exists completed_at timestamptz;

-- En qué se gastó la plata de una meta cerrada (solo anotación, no mueve plata).
alter table savings_goals add column if not exists used_for text;
alter table savings_goals add column if not exists used_at date;

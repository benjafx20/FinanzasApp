-- PARTE 5: deudas que mueven plata de una categoría, y permisos para editar
-- traspasos y aportes a metas. Pegar en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo más de una vez. Las deudas que ya tienes no cambian.

-- Deudas: de qué categoría sale la plata (le presté / pagué lo que debía) y a cuál
-- entra (me devolvieron). Null = solo registro, no mueve plata (como era antes).
alter table debts add column if not exists source_category_id uuid references categories(id) on delete set null;
alter table debts add column if not exists destination_category_id uuid references categories(id) on delete set null;
create index if not exists idx_debts_source on debts(source_category_id);
create index if not exists idx_debts_destination on debts(destination_category_id);

-- Editar traspasos.
drop policy if exists "budget_transfers_update_own" on budget_transfers;
create policy "budget_transfers_update_own" on budget_transfers for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Editar aportes a metas de ahorro.
drop policy if exists "savings_contributions_update_own" on savings_contributions;
create policy "savings_contributions_update_own" on savings_contributions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PARTE 7: equipos que ya no se van a vender (solo repuestos o dados por pérdida).
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

create table if not exists inventory_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  etiqueta_key text not null,
  estado text not null check (estado in ('repuesto', 'perdida')),
  updated_at timestamptz default now(),
  primary key (user_id, category_id, etiqueta_key)
);
alter table inventory_status enable row level security;
drop policy if exists "inventory_status_select_own" on inventory_status;
create policy "inventory_status_select_own" on inventory_status for select to authenticated using (auth.uid() = user_id);
drop policy if exists "inventory_status_insert_own" on inventory_status;
create policy "inventory_status_insert_own" on inventory_status for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "inventory_status_update_own" on inventory_status;
create policy "inventory_status_update_own" on inventory_status for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "inventory_status_delete_own" on inventory_status;
create policy "inventory_status_delete_own" on inventory_status for delete to authenticated using (auth.uid() = user_id);

-- Los avisos de equipos sin vender ignoran los que quedaron para repuestos o dados por pérdida.
create or replace function public.inventory_alerts(p_user uuid)
returns table (nombre text, costo numeric, primera_compra date, dias int)
language sql
security definer
set search_path = public
as $$
  select min(e.etiqueta) as nombre,
         sum(e.monto)::numeric as costo,
         min(e.fecha) as primera_compra,
         ((now() at time zone 'America/Santiago')::date - min(e.fecha))::int as dias
  from expenses e
  join category_preferences cp
    on cp.category_id = e.category_id and cp.user_id = e.user_id and cp.es_inventario
  where e.user_id = p_user
    and e.etiqueta is not null
    and not exists (
      select 1 from category_fundings f
      where f.user_id = e.user_id
        and f.category_id = e.category_id
        and lower(trim(f.etiqueta)) = lower(trim(e.etiqueta))
    )
    and not exists (
      select 1 from inventory_status s
      where s.user_id = e.user_id
        and s.category_id = e.category_id
        and s.etiqueta_key = lower(trim(e.etiqueta))
    )
  group by e.category_id, lower(trim(e.etiqueta));
$$;
revoke all on function public.inventory_alerts(uuid) from public, anon, authenticated;
grant execute on function public.inventory_alerts(uuid) to service_role;

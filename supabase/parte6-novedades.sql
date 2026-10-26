-- PARTE 6: aprendizaje de comercios, inventario de equipos y notificaciones push.
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

-- ---------- Aprender la categoría de cada comercio ----------
create table if not exists merchant_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  comercio_key text not null,
  category_id uuid not null references categories(id) on delete cascade,
  updated_at timestamptz default now(),
  primary key (user_id, comercio_key)
);
alter table merchant_categories enable row level security;
drop policy if exists "merchant_categories_select_own" on merchant_categories;
create policy "merchant_categories_select_own" on merchant_categories for select to authenticated using (auth.uid() = user_id);
drop policy if exists "merchant_categories_insert_own" on merchant_categories;
create policy "merchant_categories_insert_own" on merchant_categories for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "merchant_categories_update_own" on merchant_categories;
create policy "merchant_categories_update_own" on merchant_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "merchant_categories_delete_own" on merchant_categories;
create policy "merchant_categories_delete_own" on merchant_categories for delete to authenticated using (auth.uid() = user_id);

-- ---------- Inventario de equipos (por usuario y categoría) ----------
alter table category_preferences add column if not exists es_inventario boolean not null default false;

-- Por ahora solo Celulares: se marca la(s) categoría(s) cuyo nombre contiene "celular".
insert into category_preferences (user_id, category_id, es_inventario)
select u.id, c.id, true
from auth.users u
cross join categories c
where c.nombre ilike '%celular%' and (c.user_id is null or c.user_id = u.id)
on conflict (user_id, category_id) do update set es_inventario = true;

-- Equipos sin vender de un usuario (la usa el servidor para las notificaciones).
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
  group by e.category_id, lower(trim(e.etiqueta));
$$;
revoke all on function public.inventory_alerts(uuid) from public, anon, authenticated;
grant execute on function public.inventory_alerts(uuid) to service_role;

-- ---------- Notificaciones push: dispositivos suscritos ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_update_own" on push_subscriptions;
create policy "push_subscriptions_update_own" on push_subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions for delete to authenticated using (auth.uid() = user_id);

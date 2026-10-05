-- ============================================================
-- TODO LO NUEVO PARA SUPABASE (en orden). Pegar completo en SQL Editor > Run.
-- Es seguro correrlo más de una vez, aunque ya hayas corrido partes.
-- ============================================================

-- PARTE 2: agrupar ingresos/aportes con "agrupar como".
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

alter table category_fundings add column if not exists etiqueta text;
create index if not exists idx_category_fundings_etiqueta on category_fundings(etiqueta);

-- PARTE 2b: permitir editar el grupo ("agrupar como") de un aporte ya creado.
-- Hasta ahora la tabla solo permitía leer, crear y borrar aportes; falta el permiso de actualizar.
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

drop policy if exists "category_fundings_update_own" on category_fundings;
create policy "category_fundings_update_own"
  on category_fundings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PARTE 1: presupuesto semanal
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo más de una vez.
-- ============================================================

create extension if not exists pg_cron with schema extensions;

-- ---------- 1. Planes (uno por categoría mientras esté activo) ----------
create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monto_semanal numeric(12,2) not null check (monto_semanal > 0),
  semanas int not null check (semanas between 1 and 52),
  fecha_inicio date not null,
  sobrante_category_id uuid references categories(id) on delete set null,
  estado text not null default 'activo' check (estado in ('activo', 'apagado', 'terminado')),
  created_at timestamptz default now()
);

create unique index if not exists weekly_plans_una_activa_por_categoria
  on weekly_plans(category_id) where estado = 'activo';
create index if not exists idx_weekly_plans_user_id on weekly_plans(user_id);

-- ---------- 2. Cierres de semana (los escribe el proceso automático) ----------
-- semana_num = 0 guarda la deuda heredada de un presupuesto anterior.
create table if not exists weekly_plan_closures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  semana_num int not null,
  gastado numeric(12,2) not null default 0,
  sobrante_movido numeric(12,2) not null default 0,
  deuda_arrastrada numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  unique (plan_id, semana_num)
);
create index if not exists idx_weekly_plan_closures_user_id on weekly_plan_closures(user_id);

-- ---------- 3. Permisos (RLS) ----------
alter table weekly_plans enable row level security;
alter table weekly_plan_closures enable row level security;

drop policy if exists "weekly_plans_select_own" on weekly_plans;
create policy "weekly_plans_select_own" on weekly_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists "weekly_plans_insert_own" on weekly_plans;
create policy "weekly_plans_insert_own" on weekly_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "weekly_plans_update_own" on weekly_plans;
create policy "weekly_plans_update_own" on weekly_plans for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "weekly_plans_delete_own" on weekly_plans;
create policy "weekly_plans_delete_own" on weekly_plans for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "weekly_plan_closures_select_own" on weekly_plan_closures;
create policy "weekly_plan_closures_select_own" on weekly_plan_closures for select to authenticated using (auth.uid() = user_id);
drop policy if exists "weekly_plan_closures_insert_own" on weekly_plan_closures;
create policy "weekly_plan_closures_insert_own" on weekly_plan_closures for insert to authenticated with check (auth.uid() = user_id);

-- ---------- 4. Cierre automático de semanas ----------
-- Cierra cada semana ya terminada (lunes a domingo, hora de Chile):
--  * sobrante  = monto - deuda anterior - gastado  (si es > 0 se mueve a la
--    categoría elegida como un traspaso normal, sin pasar del saldo real)
--  * si te pasaste, queda como deuda y se descuenta de la semana siguiente.
-- Si un día no corre, la siguiente ejecución cierra las semanas pendientes.
create or replace function public.weekly_plan_sweep()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  k int;
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v_fin1 date;
  v_ini date;
  v_fin date;
  v_ultima int;
  v_deuda numeric;
  v_gasto numeric;
  v_disp numeric;
  v_saldo numeric;
  v_mover numeric;
  v_nueva_deuda numeric;
begin
  for p in select * from weekly_plans where estado = 'activo' loop
    v_fin1 := p.fecha_inicio + (7 - extract(isodow from p.fecha_inicio)::int);

    select coalesce(max(semana_num), 0) into v_ultima
      from weekly_plan_closures where plan_id = p.id;
    select coalesce(deuda_arrastrada, 0) into v_deuda
      from weekly_plan_closures where plan_id = p.id and semana_num = v_ultima;
    v_deuda := coalesce(v_deuda, 0);

    for k in (v_ultima + 1)..p.semanas loop
      v_fin := v_fin1 + 7 * (k - 1);
      exit when v_fin >= v_hoy;  -- esa semana aún no termina
      v_ini := case when k = 1 then p.fecha_inicio else v_fin - 6 end;

      select coalesce(sum(monto), 0) into v_gasto
        from expenses
        where category_id = p.category_id and fecha between v_ini and v_fin;

      v_disp := p.monto_semanal - v_deuda - v_gasto;
      v_mover := 0;
      v_nueva_deuda := 0;

      if v_disp > 0 then
        if p.sobrante_category_id is not null then
          select
            coalesce((select sum(monto) from category_fundings where category_id = p.category_id), 0)
            + coalesce((select sum(monto) from budget_transfers where to_category_id = p.category_id), 0)
            - coalesce((select sum(monto) from budget_transfers where from_category_id = p.category_id), 0)
            - coalesce((select sum(monto) from expenses where coalesce(funding_category_id, category_id) = p.category_id), 0)
          into v_saldo;
          v_mover := least(v_disp, greatest(v_saldo, 0));
          if v_mover > 0 then
            insert into budget_transfers (user_id, from_category_id, to_category_id, monto, nota, fecha)
            values (p.user_id, p.category_id, p.sobrante_category_id, v_mover,
                    'Sobrante semana ' || k || ' (presupuesto semanal)', v_fin);
          end if;
        end if;
      else
        v_nueva_deuda := -v_disp;
      end if;

      insert into weekly_plan_closures (user_id, plan_id, semana_num, gastado, sobrante_movido, deuda_arrastrada)
      values (p.user_id, p.id, k, v_gasto, v_mover, v_nueva_deuda)
      on conflict (plan_id, semana_num) do nothing;

      v_deuda := v_nueva_deuda;
    end loop;

    if exists (select 1 from weekly_plan_closures where plan_id = p.id and semana_num = p.semanas) then
      update weekly_plans set estado = 'terminado' where id = p.id;
    end if;
  end loop;
end;
$$;

-- Nadie puede llamarla desde la app: solo el cron.
revoke all on function public.weekly_plan_sweep() from public, anon, authenticated;

-- ---------- 5. Programar el cierre ----------
-- Corre todos los días a las 03:10 y 04:10 UTC (pasada la medianoche en Chile,
-- con horario de verano o de invierno). Si ya cerró, no repite nada.
select cron.unschedule('presupuesto-semanal-cierre')
where exists (select 1 from cron.job where jobname = 'presupuesto-semanal-cierre');

select cron.schedule(
  'presupuesto-semanal-cierre',
  '10 3,4 * * *',
  $$ select public.weekly_plan_sweep(); $$
);

-- Para revisar que quedó programado:
-- select * from cron.job where jobname = 'presupuesto-semanal-cierre';
-- Para probarlo a mano: select public.weekly_plan_sweep();

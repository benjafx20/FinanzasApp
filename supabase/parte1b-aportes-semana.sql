-- PARTE 1b: los aportes de la semana suman al presupuesto semanal.
-- Pegar en Supabase > SQL Editor > New query > Run. Solo reemplaza la función de cierre.

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
  v_aportes numeric;
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

      -- Plata que entró a la categoría esa semana (aportes y traspasos recibidos,
      -- sin contar los sobrantes que mueve este mismo proceso).
      select coalesce(sum(monto), 0) into v_aportes
        from category_fundings
        where category_id = p.category_id and fecha between v_ini and v_fin;
      v_aportes := v_aportes + coalesce((
        select sum(monto) from budget_transfers
        where to_category_id = p.category_id and fecha between v_ini and v_fin
          and coalesce(nota, '') not like 'Sobrante semana%'
      ), 0);

      v_disp := p.monto_semanal + v_aportes - v_deuda - v_gasto;
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

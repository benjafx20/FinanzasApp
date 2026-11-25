-- PARTE 8: seguridad y privacidad (auditoria, consentimiento de IA).
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo mas de una vez.

-- ---------- 1. Registro de auditoria ----------
-- Guarda quien hizo que (tabla, operacion e id del registro). No guarda montos
-- ni notas, para no duplicar datos personales. Cada usuario ve solo lo suyo y
-- nadie puede escribirlo ni borrarlo desde la app: solo lo llenan los triggers.
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tabla text not null,
  operacion text not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id text,
  creado_en timestamptz not null default now()
);
create index if not exists idx_audit_log_user_fecha on audit_log(user_id, creado_en desc);
alter table audit_log enable row level security;

drop policy if exists "audit_log_select_own" on audit_log;
create policy "audit_log_select_own" on audit_log for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete, truncate on audit_log from anon, authenticated;

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_user := old.user_id;
    v_id := old.id::text;
  else
    v_user := new.user_id;
    v_id := new.id::text;
  end if;
  if v_user is null then
    return null;
  end if;
  -- Si se esta borrando la cuenta completa, no se registra cada fila.
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = v_user) then
    return null;
  end if;
  insert into audit_log (user_id, tabla, operacion, registro_id) values (v_user, tg_table_name, tg_op, v_id);
  return null;
end;
$$;
revoke all on function public.registrar_auditoria() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'expenses', 'incomes', 'debts', 'categories', 'savings_goals', 'savings_contributions',
    'category_fundings', 'budget_transfers', 'recurring_expenses', 'weekly_plans'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'id'
    ) then
      execute format('drop trigger if exists trg_auditoria on public.%I', t);
      execute format(
        'create trigger trg_auditoria after insert or update or delete on public.%I for each row execute function public.registrar_auditoria()',
        t
      );
    end if;
  end loop;
end;
$$;

-- ---------- 2. Consentimiento para usar IA ----------
-- Deja constancia de que el usuario acepto enviar boletas y datos a Gemini
-- (Google). Puede retirarlo cuando quiera borrando su fila.
create table if not exists user_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('ia_boletas', 'ia_asistente')),
  version text not null,
  aceptado_en timestamptz not null default now(),
  primary key (user_id, tipo)
);
alter table user_consents enable row level security;

drop policy if exists "user_consents_select_own" on user_consents;
create policy "user_consents_select_own" on user_consents for select to authenticated using (auth.uid() = user_id);
drop policy if exists "user_consents_insert_own" on user_consents;
create policy "user_consents_insert_own" on user_consents for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "user_consents_update_own" on user_consents;
create policy "user_consents_update_own" on user_consents for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_consents_delete_own" on user_consents;
create policy "user_consents_delete_own" on user_consents for delete to authenticated using (auth.uid() = user_id);

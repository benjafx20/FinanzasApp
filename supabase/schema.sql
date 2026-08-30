-- ============================================================
-- FINANZAS APP - Schema inicial (MVP)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ---------- 1. CATEGORÍAS ----------
-- user_id NULL = categoría global (predefinida, visible para todos).
-- user_id con valor = categoría creada por ese usuario, solo él la ve.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  icono text not null,        -- nombre de ícono (lucide-react)
  color text not null,        -- hex, para UI
  created_at timestamptz default now()
);

alter table categories add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Evita duplicados reales: nombre único entre las categorías globales,
-- y nombre único por usuario entre sus propias categorías.
-- IMPORTANTE: si ya tienes categorías duplicadas, ejecuta primero
-- cleanup-duplicate-categories.sql o esta línea va a fallar.
create unique index if not exists idx_categories_nombre_global_unique
  on categories (nombre) where user_id is null;
create unique index if not exists idx_categories_user_nombre_unique
  on categories (user_id, nombre) where user_id is not null;

insert into categories (nombre, icono, color) values
  ('Comida', 'utensils', '#F59E0B'),
  ('Transporte', 'car', '#3B82F6'),
  ('Ocio', 'popcorn', '#EC4899'),
  ('Servicios', 'receipt', '#8B5CF6'),
  ('Salud', 'heart-pulse', '#EF4444'),
  ('Otros', 'more-horizontal', '#6B7280')
on conflict (nombre) where user_id is null do nothing;

-- ---------- 2. GASTOS ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id),
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  nota text,
  created_at timestamptz default now()
);

-- Si la categoría ya existía como NOT NULL de una versión anterior del
-- schema, esto la hace opcional: al borrar una categoría, el gasto se
-- conserva íntegro (monto, fecha, nota) pero queda "Sin categoría", en
-- vez de bloquear el borrado o destruir el gasto.
alter table expenses alter column category_id drop not null;
alter table expenses drop constraint if exists expenses_category_id_fkey;
alter table expenses add constraint expenses_category_id_fkey
  foreign key (category_id) references categories(id) on delete set null;

create index if not exists idx_expenses_user_id on expenses(user_id);
create index if not exists idx_expenses_fecha on expenses(fecha);

-- Si el gasto se pagó con el saldo de OTRA categoría (ej: compraste algo
-- de Celulares pero lo pagaste con la plata de Beca), esta columna indica
-- de dónde salió realmente la plata. El gasto se sigue contando y
-- mostrando en `category_id` (para que sepas "en qué se gastó"), pero el
-- saldo que baja es el de `funding_category_id`. Si es NULL, se pagó con
-- el saldo de su propia categoría (el caso normal).
alter table expenses add column if not exists funding_category_id uuid references categories(id) on delete set null;

-- ---------- 3. METAS DE GASTO (opcionales) ----------
-- Esto YA NO es "cuánta plata tienes" (eso lo maneja el saldo real de la
-- categoría, ver category_fundings + budget_transfers + expenses más abajo).
-- Es solo una meta informativa: "quiero gastar máximo $X esta semana/mes en
-- esta categoría", para avisar si te estás pasando. No afecta el saldo.
-- Un presupuesto por usuario + categoría + período.
-- `periodo`: 'mensual' o 'semanal'.
-- `mes`: la clave del período — 'YYYY-MM' si es mensual, 'YYYY-Www' (semana
-- ISO) si es semanal. El nombre de columna quedó de la versión anterior;
-- se reutiliza para no perder los datos ya guardados.
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monto_limite numeric(12,2) not null check (monto_limite > 0),
  mes text not null,
  created_at timestamptz default now()
);

alter table budgets add column if not exists periodo text not null default 'mensual';
alter table budgets drop constraint if exists budgets_periodo_check;
alter table budgets add constraint budgets_periodo_check check (periodo in ('mensual', 'semanal'));

alter table budgets drop constraint if exists budgets_user_id_category_id_mes_key;
alter table budgets drop constraint if exists budgets_user_category_periodo_mes_key;
alter table budgets add constraint budgets_user_category_periodo_mes_key
  unique (user_id, category_id, periodo, mes);

create index if not exists idx_budgets_user_id on budgets(user_id);

-- ---------- 4. METAS DE AHORRO ----------
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  monto_objetivo numeric(12,2) not null check (monto_objetivo > 0),
  fecha_objetivo date,
  created_at timestamptz default now()
);

create index if not exists idx_savings_goals_user_id on savings_goals(user_id);

-- ---------- 5. APORTES A METAS ----------
create table if not exists savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references savings_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_savings_contributions_goal_id on savings_contributions(goal_id);
create index if not exists idx_savings_contributions_user_id on savings_contributions(user_id);

-- ---------- 6. INGRESOS ----------
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  fecha date not null default current_date,
  nota text,
  created_at timestamptz default now()
);

create index if not exists idx_incomes_user_id on incomes(user_id);
create index if not exists idx_incomes_fecha on incomes(fecha);

-- ---------- 7. GASTOS RECURRENTES (plantillas) ----------
-- Define un gasto que se repite cada mes en un día fijo (ej: arriendo el día 5).
-- El registro real en `expenses` se genera automáticamente al abrir la app
-- ese día o después (ver lógica en el frontend, hook useRecurringExpenses).
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id),
  nombre text not null,
  monto numeric(12,2) not null check (monto > 0),
  dia_mes integer not null check (dia_mes between 1 and 31),
  activo boolean not null default true,
  created_at timestamptz default now()
);

alter table recurring_expenses alter column category_id drop not null;
alter table recurring_expenses drop constraint if exists recurring_expenses_category_id_fkey;
alter table recurring_expenses add constraint recurring_expenses_category_id_fkey
  foreign key (category_id) references categories(id) on delete set null;

create index if not exists idx_recurring_expenses_user_id on recurring_expenses(user_id);

-- Vincula un gasto generado automáticamente con su plantilla recurrente,
-- para no duplicarlo dos veces en el mismo mes.
alter table expenses add column if not exists recurring_expense_id uuid references recurring_expenses(id) on delete set null;

-- Red de seguridad: nunca puede haber 2 gastos generados por la misma
-- plantilla recurrente en el mismo mes calendario, sin importar si lo
-- intenta generar el cron dos veces o cualquier otro proceso.
drop index if exists idx_expenses_recurring_unique_month;
create unique index if not exists idx_expenses_recurring_unique_month
  on expenses (
    recurring_expense_id,
    date_trunc('month', fecha)::date
  )
  where recurring_expense_id is not null;

-- ---------- 8. TRANSFERENCIAS ENTRE CATEGORÍAS ----------
-- Registro de "mover plata" de una categoría a otra. Es un movimiento
-- contable separado de los gastos reales: no crea ni modifica ningún
-- `expense`, solo cambia el saldo real de cada categoría. Ya no está
-- amarrado a un período — el saldo de una categoría nunca se resetea
-- solo porque cambió la semana o el mes.
create table if not exists budget_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_category_id uuid references categories(id) on delete set null,
  to_category_id uuid references categories(id) on delete set null,
  monto numeric(12,2) not null check (monto > 0),
  nota text,
  fecha date not null default current_date,
  created_at timestamptz default now()
);

-- Las transferencias ya no se filtran por período (ver comentario arriba).
alter table budget_transfers drop column if exists periodo;
alter table budget_transfers drop column if exists periodo_key;

create index if not exists idx_budget_transfers_user_id on budget_transfers(user_id);

-- ---------- 10. APORTES A CATEGORÍA (fondos que suben el saldo) ----------
-- Cómo entra plata "de la nada" a una categoría: repartiendo un ingreso
-- entre categorías al registrarlo, o agregando plata a mano en cualquier
-- momento (ej: vendiste algo y le sumas esa plata a Celulares).
create table if not exists category_fundings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  monto numeric(12,2) not null check (monto > 0),
  origen text not null check (origen in ('ingreso', 'manual')),
  income_id uuid references incomes(id) on delete set null,
  nota text,
  fecha date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_category_fundings_user_id on category_fundings(user_id);
create index if not exists idx_category_fundings_category_id on category_fundings(category_id);

-- ---------- 9. PREFERENCIAS DE CATEGORÍA POR USUARIO ----------
-- Orden personalizado y "ocultar" — incluso para categorías globales
-- (predefinidas), que no se pueden borrar porque son compartidas por
-- todos, pero sí se pueden ocultar de la vista de cada usuario.
create table if not exists category_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  orden integer,
  oculta boolean not null default false,
  primary key (user_id, category_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Sin esto, cualquier usuario autenticado podría leer/editar
-- los gastos y presupuestos de otros usuarios.
-- ============================================================

alter table categories enable row level security;
alter table expenses enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table savings_contributions enable row level security;
alter table incomes enable row level security;
alter table recurring_expenses enable row level security;
alter table budget_transfers enable row level security;
alter table category_preferences enable row level security;
alter table category_fundings enable row level security;

-- Categorías: cualquiera ve las globales (user_id null) y las suyas propias.
-- Solo puede crear/editar/eliminar las suyas (nunca las globales).
drop policy if exists "categories_select_global_or_own" on categories;
create policy "categories_select_global_or_own"
  on categories for select
  to authenticated
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "categories_insert_own" on categories;
create policy "categories_insert_own"
  on categories for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on categories;
create policy "categories_update_own"
  on categories for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on categories;
create policy "categories_delete_own"
  on categories for delete
  to authenticated
  using (auth.uid() = user_id);

-- Gastos: cada usuario solo ve/modifica los suyos
drop policy if exists "expenses_select_own" on expenses;
create policy "expenses_select_own"
  on expenses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on expenses;
create policy "expenses_insert_own"
  on expenses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on expenses;
create policy "expenses_update_own"
  on expenses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on expenses;
create policy "expenses_delete_own"
  on expenses for delete
  to authenticated
  using (auth.uid() = user_id);

-- Presupuestos: mismo criterio que gastos
drop policy if exists "budgets_select_own" on budgets;
create policy "budgets_select_own"
  on budgets for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "budgets_insert_own" on budgets;
create policy "budgets_insert_own"
  on budgets for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "budgets_update_own" on budgets;
create policy "budgets_update_own"
  on budgets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "budgets_delete_own" on budgets;
create policy "budgets_delete_own"
  on budgets for delete
  to authenticated
  using (auth.uid() = user_id);

-- Metas de ahorro: mismo criterio
drop policy if exists "savings_goals_select_own" on savings_goals;
create policy "savings_goals_select_own"
  on savings_goals for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "savings_goals_insert_own" on savings_goals;
create policy "savings_goals_insert_own"
  on savings_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "savings_goals_update_own" on savings_goals;
create policy "savings_goals_update_own"
  on savings_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "savings_goals_delete_own" on savings_goals;
create policy "savings_goals_delete_own"
  on savings_goals for delete
  to authenticated
  using (auth.uid() = user_id);

-- Aportes: mismo criterio
drop policy if exists "savings_contributions_select_own" on savings_contributions;
create policy "savings_contributions_select_own"
  on savings_contributions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "savings_contributions_insert_own" on savings_contributions;
create policy "savings_contributions_insert_own"
  on savings_contributions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "savings_contributions_delete_own" on savings_contributions;
create policy "savings_contributions_delete_own"
  on savings_contributions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ingresos: mismo criterio
drop policy if exists "incomes_select_own" on incomes;
create policy "incomes_select_own"
  on incomes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "incomes_insert_own" on incomes;
create policy "incomes_insert_own"
  on incomes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "incomes_update_own" on incomes;
create policy "incomes_update_own"
  on incomes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "incomes_delete_own" on incomes;
create policy "incomes_delete_own"
  on incomes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Gastos recurrentes: mismo criterio
drop policy if exists "recurring_expenses_select_own" on recurring_expenses;
create policy "recurring_expenses_select_own"
  on recurring_expenses for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "recurring_expenses_insert_own" on recurring_expenses;
create policy "recurring_expenses_insert_own"
  on recurring_expenses for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "recurring_expenses_update_own" on recurring_expenses;
create policy "recurring_expenses_update_own"
  on recurring_expenses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recurring_expenses_delete_own" on recurring_expenses;
create policy "recurring_expenses_delete_own"
  on recurring_expenses for delete
  to authenticated
  using (auth.uid() = user_id);

-- Transferencias entre presupuestos: mismo criterio (solo lectura, creación
-- y borrado — es un registro contable, no se edita, se anula borrándolo)
drop policy if exists "budget_transfers_select_own" on budget_transfers;
create policy "budget_transfers_select_own"
  on budget_transfers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "budget_transfers_insert_own" on budget_transfers;
create policy "budget_transfers_insert_own"
  on budget_transfers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "budget_transfers_delete_own" on budget_transfers;
create policy "budget_transfers_delete_own"
  on budget_transfers for delete
  to authenticated
  using (auth.uid() = user_id);

-- Preferencias de categoría: cada usuario solo ve/edita las suyas
drop policy if exists "category_preferences_select_own" on category_preferences;
create policy "category_preferences_select_own"
  on category_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "category_preferences_insert_own" on category_preferences;
create policy "category_preferences_insert_own"
  on category_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "category_preferences_update_own" on category_preferences;
create policy "category_preferences_update_own"
  on category_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "category_preferences_delete_own" on category_preferences;
create policy "category_preferences_delete_own"
  on category_preferences for delete
  to authenticated
  using (auth.uid() = user_id);

-- Aportes a categoría: mismo criterio
drop policy if exists "category_fundings_select_own" on category_fundings;
create policy "category_fundings_select_own"
  on category_fundings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "category_fundings_insert_own" on category_fundings;
create policy "category_fundings_insert_own"
  on category_fundings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "category_fundings_delete_own" on category_fundings;
create policy "category_fundings_delete_own"
  on category_fundings for delete
  to authenticated
  using (auth.uid() = user_id);

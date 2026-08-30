-- ============================================================
-- LIMPIEZA ÚNICA: categorías globales duplicadas
-- Ejecutar UNA VEZ en el SQL Editor de Supabase, ANTES de
-- volver a correr schema.sql (que agrega una restricción única
-- que fallaría si todavía hay duplicados).
--
-- Es seguro volver a ejecutar este script más de una vez: si no
-- hay duplicados, no hace nada.
-- ============================================================

-- Si tu tabla `categories` todavía no tiene la columna user_id
-- (porque aún no ejecutaste el schema.sql actualizado), la crea aquí.
-- Es seguro ejecutar esto aunque la columna ya exista.
alter table categories add column if not exists user_id uuid references auth.users(id) on delete cascade;

create temporary table cat_dedupe as
select id,
       nombre,
       first_value(id) over (partition by nombre order by created_at asc, id asc) as id_bueno
from categories
where user_id is null;

-- Repunta cualquier gasto, presupuesto o gasto recurrente que apuntaba
-- a una categoría duplicada hacia la copia que se va a conservar.
update expenses e set category_id = d.id_bueno
from cat_dedupe d where e.category_id = d.id and d.id <> d.id_bueno;

update budgets b set category_id = d.id_bueno
from cat_dedupe d where b.category_id = d.id and d.id <> d.id_bueno;

update recurring_expenses r set category_id = d.id_bueno
from cat_dedupe d where r.category_id = d.id and d.id <> d.id_bueno;

-- Elimina las copias duplicadas, dejando solo la más antigua de cada nombre.
delete from categories c using cat_dedupe d
where c.id = d.id and d.id <> d.id_bueno;

drop table cat_dedupe;

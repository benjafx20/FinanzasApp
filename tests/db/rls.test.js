import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { crearBaseDatos, crearUsuario, comoUsuario, intentar } from './baseDatos';

let db;
let ana;
let beto;

const TABLAS_CON_USER = [
  'budget_transfers', 'budgets', 'categories', 'category_fundings', 'category_preferences', 'debts',
  'expenses', 'incomes', 'inventory_status', 'merchant_categories', 'push_subscriptions',
  'recurring_expenses', 'savings_contributions', 'savings_goals', 'weekly_plan_closures', 'weekly_plans',
  'audit_log', 'user_consents',
];

beforeAll(async () => {
  db = await crearBaseDatos();
  ana = await crearUsuario(db, 'ana@prueba.cl');
  beto = await crearUsuario(db, 'beto@prueba.cl');
  await db.query(`insert into expenses (user_id, monto, nota) values ($1, 1000, 'gasto de ana')`, [ana]);
  await db.query(`insert into expenses (user_id, monto, nota) values ($1, 2000, 'gasto de beto')`, [beto]);
  await db.query(`insert into incomes (user_id, monto) values ($1, 50000)`, [ana]);
  await db.query(`insert into debts (user_id, persona, tipo, monto) values ($1, 'Carlos', 'debo', 3000)`, [beto]);
}, 60000);

afterAll(async () => {
  await db.close();
});

describe('RLS: cobertura del esquema', () => {
  it('todas las tablas del esquema public tienen RLS activo', async () => {
    const r = await db.query(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`);
    expect(r.rows).toEqual([]);
  });

  it.each(TABLAS_CON_USER)('la tabla %s tiene politica de lectura que usa auth.uid()', async (tabla) => {
    const r = await db.query(
      `select qual from pg_policies where schemaname = 'public' and tablename = $1 and cmd in ('SELECT', 'ALL')`,
      [tabla]
    );
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.some((p) => /auth\.uid\(\)/.test(p.qual))).toBe(true);
  });

  it('ninguna politica de escritura esta abierta a todos (true)', async () => {
    const r = await db.query(
      `select tablename, policyname from pg_policies
       where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       and (qual = 'true' or with_check = 'true')`
    );
    expect(r.rows).toEqual([]);
  });
});

describe('Autorizacion: aislamiento entre usuarios', () => {
  it('Ana solo ve sus gastos', async () => {
    const filas = await comoUsuario(db, ana, async () => (await db.query('select nota from expenses')).rows);
    expect(filas).toEqual([{ nota: 'gasto de ana' }]);
  });

  it('Beto solo ve sus deudas y no los ingresos de Ana', async () => {
    const r = await comoUsuario(db, beto, async () => ({
      deudas: (await db.query('select persona from debts')).rows,
      ingresos: (await db.query('select monto from incomes')).rows,
    }));
    expect(r.deudas).toEqual([{ persona: 'Carlos' }]);
    expect(r.ingresos).toEqual([]);
  });

  it('un usuario anonimo no ve nada', async () => {
    const r = await comoUsuario(db, null, async () => (await db.query('select * from expenses')).rows);
    expect(r).toEqual([]);
  });

  it('un usuario anonimo no puede insertar', async () => {
    const r = await comoUsuario(db, null, () =>
      intentar(() => db.query(`insert into expenses (user_id, monto) values ($1, 5)`, [ana]))
    );
    expect(r.ok).toBe(false);
  });

  it('Ana no puede insertar un gasto a nombre de Beto', async () => {
    const r = await comoUsuario(db, ana, () =>
      intentar(() => db.query(`insert into expenses (user_id, monto) values ($1, 5)`, [beto]))
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/row-level security/i);
  });

  it('Ana no puede cambiar el dueno de su gasto (escalacion)', async () => {
    const r = await comoUsuario(db, ana, () =>
      intentar(() => db.query(`update expenses set user_id = $1 where nota = 'gasto de ana'`, [beto]))
    );
    expect(r.ok).toBe(false);
  });

  it('Ana no puede modificar ni borrar el gasto de Beto', async () => {
    const r = await comoUsuario(db, ana, async () => {
      const upd = await db.query(`update expenses set monto = 1 where nota = 'gasto de beto'`);
      const del = await db.query(`delete from expenses where nota = 'gasto de beto'`);
      return { upd: upd.affectedRows, del: del.affectedRows };
    });
    expect(r).toEqual({ upd: 0, del: 0 });
    const intacto = await db.query(`select monto from expenses where nota = 'gasto de beto'`);
    expect(Number(intacto.rows[0].monto)).toBe(2000);
  });

  it('las funciones internas no se pueden llamar desde la app', async () => {
    const a = await comoUsuario(db, ana, () => intentar(() => db.query('select public.weekly_plan_sweep()')));
    const b = await comoUsuario(db, ana, () => intentar(() => db.query('select * from public.inventory_alerts($1)', [beto])));
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });
});

describe('Integridad: restricciones de la base de datos', () => {
  it('rechaza montos cero o negativos', async () => {
    const r = await intentar(() => db.query(`insert into expenses (user_id, monto) values ($1, -5)`, [ana]));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/check/i);
  });

  it('rechaza un tipo de deuda invalido', async () => {
    const r = await intentar(() =>
      db.query(`insert into debts (user_id, persona, tipo, monto) values ($1, 'X', 'otro', 10)`, [ana])
    );
    expect(r.ok).toBe(false);
  });

  it('un gasto recurrente no se puede generar dos veces en el mismo mes', async () => {
    const plantilla = await db.query(
      `insert into recurring_expenses (user_id, nombre, monto, dia_mes) values ($1, 'Arriendo', 100, 5) returning id`,
      [ana]
    );
    const id = plantilla.rows[0].id;
    await db.query(`insert into expenses (user_id, monto, fecha, recurring_expense_id) values ($1, 100, '2026-11-05', $2)`, [ana, id]);
    const repetido = await intentar(() =>
      db.query(`insert into expenses (user_id, monto, fecha, recurring_expense_id) values ($1, 100, '2026-11-20', $2)`, [ana, id])
    );
    expect(repetido.ok).toBe(false);
    const otroMes = await intentar(() =>
      db.query(`insert into expenses (user_id, monto, fecha, recurring_expense_id) values ($1, 100, '2026-12-05', $2)`, [ana, id])
    );
    expect(otroMes.ok).toBe(true);
  });
});

describe('Auditoria', () => {
  it('registra insert, update y delete con el dueno correcto y sin guardar montos', async () => {
    const id = await comoUsuario(db, ana, async () => {
      const ins = await db.query(`insert into expenses (user_id, monto, nota) values ($1, 777, 'auditado') returning id`, [ana]);
      const nuevo = ins.rows[0].id;
      await db.query(`update expenses set monto = 888 where id = $1`, [nuevo]);
      await db.query(`delete from expenses where id = $1`, [nuevo]);
      return nuevo;
    });
    const log = await comoUsuario(db, ana, async () =>
      (await db.query(`select operacion, tabla from audit_log where registro_id = $1 order by id`, [id])).rows
    );
    expect(log.map((x) => x.operacion)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    expect(log.every((x) => x.tabla === 'expenses')).toBe(true);
    const columnas = await db.query(`select column_name from information_schema.columns where table_name = 'audit_log'`);
    expect(columnas.rows.map((c) => c.column_name)).not.toContain('monto');
  });

  it('Beto no ve el registro de Ana', async () => {
    const filas = await comoUsuario(db, beto, async () => (await db.query(`select * from audit_log where user_id = $1`, [ana])).rows);
    expect(filas).toEqual([]);
  });

  it('nadie puede escribir ni borrar la auditoria desde la app', async () => {
    const ins = await comoUsuario(db, ana, () =>
      intentar(() => db.query(`insert into audit_log (user_id, tabla, operacion) values ($1, 'x', 'INSERT')`, [ana]))
    );
    const del = await comoUsuario(db, ana, () => intentar(() => db.query('delete from audit_log')));
    const upd = await comoUsuario(db, ana, () => intentar(() => db.query(`update audit_log set tabla = 'z'`)));
    expect(ins.ok).toBe(false);
    expect(del.ok).toBe(false);
    expect(upd.ok).toBe(false);
  });
});

describe('Consentimiento de IA', () => {
  it('cada usuario guarda y ve solo su consentimiento', async () => {
    await comoUsuario(db, ana, () =>
      db.query(`insert into user_consents (user_id, tipo, version) values ($1, 'ia_boletas', '1')`, [ana])
    );
    const deAna = await comoUsuario(db, ana, async () => (await db.query('select tipo from user_consents')).rows);
    const deBeto = await comoUsuario(db, beto, async () => (await db.query('select tipo from user_consents')).rows);
    expect(deAna).toEqual([{ tipo: 'ia_boletas' }]);
    expect(deBeto).toEqual([]);
  });

  it('Ana puede retirar su consentimiento', async () => {
    await comoUsuario(db, ana, () => db.query('delete from user_consents'));
    const filas = await comoUsuario(db, ana, async () => (await db.query('select * from user_consents')).rows);
    expect(filas).toEqual([]);
  });
});

describe('Derecho al olvido: eliminar la cuenta borra todo', () => {
  it('al borrar al usuario no queda ninguna fila suya en ninguna tabla', async () => {
    const carla = await crearUsuario(db, 'carla@prueba.cl');
    await db.query(`insert into expenses (user_id, monto) values ($1, 10)`, [carla]);
    await db.query(`insert into incomes (user_id, monto) values ($1, 20)`, [carla]);
    await db.query(`insert into debts (user_id, persona, tipo, monto) values ($1, 'Z', 'debo', 5)`, [carla]);
    await db.query(`insert into user_consents (user_id, tipo, version) values ($1, 'ia_asistente', '1')`, [carla]);
    await db.query(`insert into savings_goals (user_id, nombre, monto_objetivo) values ($1, 'Meta', 100)`, [carla]);
    await db.query(`insert into recurring_expenses (user_id, nombre, monto, dia_mes) values ($1, 'R', 5, 1)`, [carla]);
    const antes = await db.query(`select count(*)::int n from audit_log where user_id = $1`, [carla]);
    expect(antes.rows[0].n).toBeGreaterThan(0);

    await db.query('delete from auth.users where id = $1', [carla]);

    const tablas = await db.query(
      `select table_name from information_schema.columns
       where table_schema = 'public' and column_name = 'user_id'`
    );
    for (const { table_name } of tablas.rows) {
      const r = await db.query(`select count(*)::int n from public.${table_name} where user_id = $1`, [carla]);
      expect(r.rows[0].n, table_name).toBe(0);
    }
  });
});

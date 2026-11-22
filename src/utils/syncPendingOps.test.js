// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { encolar, leerCola, MAX_REINTENTOS } from './offlineOps';
import { syncPendingOps } from './syncPendingOps';

const U = 'u1';

// Servidor falso: guarda lo insertado y valida que el id no exista (como Postgres).
function servidorFalso({ respuestas = [] } = {}) {
  const tablas = {};
  const llamadas = [];
  return {
    tablas,
    llamadas,
    from(tabla) {
      return {
        insert: async (payload) => {
          llamadas.push({ tabla, payload });
          const forzada = respuestas.shift();
          if (forzada) return { error: forzada };
          tablas[tabla] ||= [];
          if (tablas[tabla].some((f) => f.id === payload.id)) {
            return { error: { code: '23505', message: 'duplicate key value' } };
          }
          tablas[tabla].push(payload);
          return { error: null };
        },
      };
    },
  };
}

const ingreso = { id: 'inc-1', user_id: U, monto: 50000, fecha: '2026-11-20' };
const aporte = (id, cat, monto) => ({ id, user_id: U, category_id: cat, monto, origen: 'ingreso', income_id: 'inc-1', fecha: '2026-11-20' });

beforeEach(() => localStorage.clear());

describe('syncPendingOps', () => {
  it('sube en orden: primero el ingreso y después su reparto, y deja la cola vacía', async () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte('f1', 'A', 30000));
    encolar(U, 'funding', aporte('f2', 'B', 20000));
    encolar(U, 'contribution', { id: 'c1', goal_id: 'g1', user_id: U, monto: 5000, fecha: '2026-11-20' });
    const srv = servidorFalso();

    const res = await syncPendingOps(U, srv);

    expect(res).toMatchObject({ subidas: 4, pendientes: 0, fallidas: 0, sinRed: false });
    expect(srv.llamadas.map((l) => `${l.tabla}:${l.payload.id}`)).toEqual([
      'incomes:inc-1',
      'category_fundings:f1',
      'category_fundings:f2',
      'savings_contributions:c1',
    ]);
    expect(leerCola(U)).toEqual([]);
  });

  it('sube los ids que se crearon en el celular (así no se duplican)', async () => {
    encolar(U, 'income', ingreso);
    const srv = servidorFalso();
    await syncPendingOps(U, srv);
    expect(srv.tablas.incomes[0].id).toBe('inc-1');
  });

  it('repetir la sincronización no duplica nada', async () => {
    encolar(U, 'income', ingreso);
    const srv = servidorFalso();
    await syncPendingOps(U, srv);
    await syncPendingOps(U, srv);
    expect(srv.tablas.incomes).toHaveLength(1);
  });

  it('si la subida anterior sí llegó pero la app no alcanzó a limpiar la cola, "ya existe" cuenta como éxito', async () => {
    encolar(U, 'income', ingreso);
    const srv = servidorFalso();
    srv.tablas.incomes = [ingreso]; // ya estaba en el servidor
    const res = await syncPendingOps(U, srv);
    expect(res.subidas).toBe(1);
    expect(leerCola(U)).toEqual([]);
    expect(srv.tablas.incomes).toHaveLength(1);
  });

  it('si se corta la señal a la mitad: lo subido queda subido, el resto espera y no gasta reintentos', async () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte('f1', 'A', 30000));
    encolar(U, 'funding', aporte('f2', 'B', 20000));
    // 1ª ok (ingreso), 2ª falla por red
    const srv = servidorFalso({ respuestas: [null, { message: 'TypeError: Failed to fetch' }] });

    const res = await syncPendingOps(U, srv);

    expect(res).toMatchObject({ subidas: 1, pendientes: 2, sinRed: true });
    expect(leerCola(U).map((o) => o.payload.id)).toEqual(['f1', 'f2']);
    expect(leerCola(U).every((o) => o.intentos === 0 && !o.fallida)).toBe(true);

    // Vuelve la señal: termina el trabajo.
    const res2 = await syncPendingOps(U, srv);
    expect(res2).toMatchObject({ subidas: 2, pendientes: 0 });
    expect(srv.tablas.incomes).toHaveLength(1);
    expect(srv.tablas.category_fundings.map((f) => f.id)).toEqual(['f1', 'f2']);
  });

  it('un rechazo del servidor cuenta reintentos y, al llegar al tope, la operación queda fallida', async () => {
    encolar(U, 'contribution', { id: 'c1', goal_id: 'meta-borrada', user_id: U, monto: 5000, fecha: '2026-11-20' });
    const rechazo = { code: '23503', message: 'violates foreign key constraint' };
    const srv = servidorFalso({ respuestas: Array(MAX_REINTENTOS + 3).fill(rechazo) });

    for (let i = 0; i < MAX_REINTENTOS - 1; i++) await syncPendingOps(U, srv);
    expect(leerCola(U)[0]).toMatchObject({ intentos: MAX_REINTENTOS - 1, fallida: false });

    const res = await syncPendingOps(U, srv);
    expect(leerCola(U)[0]).toMatchObject({ intentos: MAX_REINTENTOS, fallida: true });
    expect(res.fallidas).toBe(1);

    // Ya no se reintenta sola.
    const antes = srv.llamadas.length;
    await syncPendingOps(U, srv);
    expect(srv.llamadas.length).toBe(antes);
  });

  it('si el ingreso es rechazado, su reparto no se intenta (no puede existir sin él)', async () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte('f1', 'A', 30000));
    encolar(U, 'contribution', { id: 'c1', goal_id: 'g1', user_id: U, monto: 1000, fecha: '2026-11-20' });
    const srv = servidorFalso({ respuestas: [{ code: '23514', message: 'check constraint' }] });

    const res = await syncPendingOps(U, srv);

    expect(srv.llamadas.map((l) => l.payload.id)).toEqual(['inc-1', 'c1']); // f1 se saltó
    expect(res.subidas).toBe(1);
    expect(leerCola(U).map((o) => o.payload.id)).toEqual(['inc-1', 'f1']);
  });

  it('sesión vencida (401) no cuenta como fallo de la operación', async () => {
    encolar(U, 'income', ingreso);
    const srv = servidorFalso({ respuestas: [{ status: 401, message: 'JWT expired' }] });
    const res = await syncPendingOps(U, srv);
    expect(res.sinRed).toBe(true);
    expect(leerCola(U)[0]).toMatchObject({ intentos: 0, fallida: false });
  });

  it('una excepción al llamar al servidor se trata como error y no revienta', async () => {
    encolar(U, 'income', ingreso);
    const srv = { from: () => ({ insert: async () => { throw new TypeError('Failed to fetch'); } }) };
    const res = await syncPendingOps(U, srv);
    expect(res.sinRed).toBe(true);
    expect(leerCola(U)).toHaveLength(1);
  });

  it('con la cola vacía no llama al servidor', async () => {
    const srv = servidorFalso();
    const res = await syncPendingOps(U, srv);
    expect(res).toMatchObject({ subidas: 0, pendientes: 0 });
    expect(srv.llamadas).toHaveLength(0);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---- Servidor falso en memoria (reemplaza a Supabase) ----
const servidor = vi.hoisted(() => ({ tablas: {}, caido: false, inserts: 0 }));

vi.mock('../lib/supabaseClient', () => {
  const consulta = (tabla) => {
    const filas = () => servidor.tablas[tabla] || [];
    const resolver = () => (servidor.caido ? { data: null, error: { message: 'Failed to fetch' } } : { data: [...filas()], error: null });
    const b = {
      select: () => b,
      order: () => b,
      range: async () => resolver(),
      then: (ok, fail) => Promise.resolve(resolver()).then(ok, fail),
    };
    return b;
  };
  const supabase = {
    from: (tabla) => ({
      ...consulta(tabla),
      insert: (payload) => {
        const lista = Array.isArray(payload) ? payload : [payload];
        const ejecutar = () => {
          if (servidor.caido) return { data: null, error: { message: 'Failed to fetch' } };
          servidor.tablas[tabla] ||= [];
          for (const f of lista) {
            if (servidor.tablas[tabla].some((x) => x.id === f.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          servidor.inserts += lista.length;
          servidor.tablas[tabla].push(...lista.map((f) => ({ created_at: new Date().toISOString(), ...f })));
          return { data: lista, error: null };
        };
        const r = {
          select: () => ({ then: (ok, fail) => Promise.resolve(ejecutar()).then(ok, fail) }),
          then: (ok, fail) => Promise.resolve(ejecutar()).then(ok, fail),
        };
        return r;
      },
    }),
    auth: { refreshSession: async () => ({}) },
  };
  return { supabase, withSessionRetry: (fn) => fn() };
});

import { useIncomes } from './useIncomes';
import { useCategoryFundings } from './useCategoryFundings';
import { useSavingsGoals } from './useSavingsGoals';
import { usePendingSync } from './usePendingSync';
import { calcularSaldos } from '../utils/balances';
import { leerCola, MENSAJE_PENDIENTE } from '../utils/offlineOps';

const U = 'u1';
const categorias = [{ id: 'A' }, { id: 'B' }];

function enLinea(v) {
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });
  servidor.caido = !v;
}

function montar() {
  return renderHook(() => {
    const incomes = useIncomes(U);
    const fundings = useCategoryFundings(U);
    const goals = useSavingsGoals(U);
    const sync = usePendingSync(U, {
      onSynced: () => Promise.all([incomes.refetch(), fundings.refetch(), goals.refetch()]),
    });
    return { incomes, fundings, goals, sync };
  });
}

beforeEach(() => {
  localStorage.clear();
  servidor.tablas = { savings_goals: [{ id: 'g1', nombre: 'Moto', monto_objetivo: 100000 }] };
  servidor.inserts = 0;
  enLinea(true);
});

describe('escenario completo sin conexión', () => {
  it('registra sin señal, muestra y cuenta todo, y al volver la señal sube sin duplicar', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.incomes.loading).toBe(false));
    await waitFor(() => expect(result.current.goals.loading).toBe(false));

    // --- Se va la señal ---
    enLinea(false);
    let ingreso;
    await act(async () => {
      ingreso = await result.current.incomes.addIncome({ monto: 50000, nota: 'Venta celular' });
      await result.current.fundings.addIncomeFundings(ingreso.id, [
        { categoryId: 'A', monto: 30000 },
        { categoryId: 'B', monto: 20000 },
      ], 'iPhone 12');
      await result.current.fundings.addManualFunding({ categoryId: 'A', monto: 5000, nota: 'propina' });
      await result.current.goals.addContribution('g1', 7000, 'A');
    });

    // Nada llegó al servidor, todo quedó en la cola
    expect(servidor.inserts).toBe(0);
    expect(leerCola(U)).toHaveLength(5);

    // Las listas lo muestran marcado como pendiente
    expect(result.current.incomes.incomes[0]).toMatchObject({ monto: 50000, pending: true });
    expect(result.current.fundings.fundings).toHaveLength(3);
    expect(result.current.fundings.fundings.every((f) => f.pending)).toBe(true);
    expect(result.current.goals.contributions[0]).toMatchObject({ monto: 7000, pending: true });
    // El ingreso tiene fecha local (las pantallas hacen fecha.split)
    expect(ingreso.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Los saldos ya reflejan la plata: A = 30000 + 5000 - 7000 de la meta; B = 20000
    const { saldoPorCategoria } = calcularSaldos({
      categories: categorias,
      fundings: result.current.fundings.fundings,
      contributions: result.current.goals.contributions,
    });
    expect(saldoPorCategoria).toEqual({ A: 28000, B: 20000 });
    expect(result.current.goals.totalByGoal('g1')).toBe(7000);

    // Lo pendiente no se puede editar ni borrar
    await act(async () => {
      await expect(result.current.incomes.updateIncome(ingreso.id, { monto: 1, fecha: '2026-11-21', nota: '' })).rejects.toThrow(MENSAJE_PENDIENTE);
      await expect(result.current.incomes.deleteIncome(ingreso.id)).rejects.toThrow(MENSAJE_PENDIENTE);
      await expect(result.current.fundings.deleteFundingsByIncome(ingreso.id)).rejects.toThrow(MENSAJE_PENDIENTE);
      await expect(result.current.fundings.deleteFunding(result.current.fundings.fundings[0].id)).rejects.toThrow(MENSAJE_PENDIENTE);
      await expect(result.current.goals.deleteContribution(result.current.goals.contributions[0].id)).rejects.toThrow(MENSAJE_PENDIENTE);
      await expect(result.current.goals.deleteGoal('g1')).rejects.toThrow(MENSAJE_PENDIENTE);
    });
    expect(result.current.sync.total).toBe(5);

    // --- Vuelve la señal ---
    enLinea(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(leerCola(U)).toHaveLength(0));
    await waitFor(() => expect(result.current.incomes.incomes.every((i) => !i.pending)).toBe(true));

    // Todo quedó en el servidor, una sola vez
    expect(servidor.tablas.incomes).toHaveLength(1);
    expect(servidor.tablas.category_fundings).toHaveLength(3);
    expect(servidor.tablas.savings_contributions).toHaveLength(1);
    // El reparto quedó enlazado al ingreso real
    expect(servidor.tablas.category_fundings.filter((f) => f.income_id === ingreso.id)).toHaveLength(2);
    expect(servidor.tablas.category_fundings.find((f) => f.etiqueta === 'iPhone 12')).toBeTruthy();

    // En pantalla: sin duplicados, sin marcas, mismos saldos
    await waitFor(() => expect(result.current.fundings.fundings.every((f) => !f.pending)).toBe(true));
    expect(result.current.incomes.incomes).toHaveLength(1);
    expect(result.current.fundings.fundings).toHaveLength(3);
    expect(result.current.goals.contributions).toHaveLength(1);
    const despues = calcularSaldos({ categories: categorias, fundings: result.current.fundings.fundings, contributions: result.current.goals.contributions });
    expect(despues.saldoPorCategoria).toEqual({ A: 28000, B: 20000 });

    // Ya se puede editar/borrar lo sincronizado
    await act(async () => {
      await result.current.fundings.deleteFundingsByIncome(ingreso.id).catch(() => {});
    });
  });

  it('con conexión sigue funcionando normal (sin cola)', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.incomes.loading).toBe(false));
    await act(async () => {
      const ing = await result.current.incomes.addIncome({ monto: 1000, fecha: '2026-11-20', nota: 'x' });
      await result.current.fundings.addIncomeFundings(ing.id, [{ categoryId: 'A', monto: 1000 }]);
    });
    expect(servidor.inserts).toBe(2);
    expect(leerCola(U)).toHaveLength(0);
    expect(result.current.incomes.incomes[0].pending).toBeUndefined();
  });

  it('señal mala: navigator dice online pero el servidor no responde → queda en cola, no se pierde', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.incomes.loading).toBe(false));
    servidor.caido = true; // navigator.onLine sigue en true
    await act(async () => {
      await result.current.incomes.addIncome({ monto: 2500, fecha: '2026-11-20', nota: 'mala señal' });
    });
    expect(leerCola(U)).toHaveLength(1);
    expect(result.current.incomes.incomes[0].pending).toBe(true);
  });

  it('un ingreso hecho sin señal y repartido ya con señal: el reparto espera al ingreso', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.incomes.loading).toBe(false));
    enLinea(false);
    let ing;
    await act(async () => {
      ing = await result.current.incomes.addIncome({ monto: 9000, fecha: '2026-11-20', nota: 'x' });
    });
    // Vuelve la señal ANTES de que corra la sincronización y se reparte el ingreso
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    servidor.caido = false;
    await act(async () => {
      await result.current.fundings.addIncomeFundings(ing.id, [{ categoryId: 'A', monto: 9000 }]);
    });
    // El aporte NO se intentó subir directo (fallaría por clave foránea): quedó en cola detrás del ingreso
    expect(leerCola(U).map((o) => o.kind)).toEqual(['income', 'funding']);
    await act(async () => {
      await result.current.sync.sincronizar();
    });
    expect(leerCola(U)).toHaveLength(0);
    expect(servidor.tablas.category_fundings[0].income_id).toBe(ing.id);
  });
});

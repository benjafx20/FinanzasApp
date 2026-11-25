// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPendingExpenses, queuePendingExpense, removePendingExpense, updatePendingExpense } from './offlineQueue';

beforeEach(() => localStorage.clear());

describe('offlineQueue', () => {
  it('sin usuario o sin datos devuelve lista vacia', () => {
    expect(getPendingExpenses(null)).toEqual([]);
    expect(getPendingExpenses('u1')).toEqual([]);
  });

  it('guarda un gasto pendiente con id propio y marca pending', () => {
    const p = queuePendingExpense('u1', { monto: 1000, nota: 'pan' });
    expect(p.id).toMatch(/^pending-/);
    expect(p.pending).toBe(true);
    expect(getPendingExpenses('u1')).toHaveLength(1);
  });

  it('cada usuario tiene su propia cola', () => {
    queuePendingExpense('u1', { monto: 1 });
    queuePendingExpense('u2', { monto: 2 });
    expect(getPendingExpenses('u1')).toHaveLength(1);
    expect(getPendingExpenses('u2')[0].monto).toBe(2);
  });

  it('actualiza y elimina un pendiente', () => {
    const p = queuePendingExpense('u1', { monto: 1000 });
    expect(updatePendingExpense('u1', p.id, { monto: 2000 }).monto).toBe(2000);
    removePendingExpense('u1', p.id);
    expect(getPendingExpenses('u1')).toEqual([]);
  });

  it('si el almacenamiento tiene datos corruptos no se cae', () => {
    localStorage.setItem('finanzas_pending_expenses_u1', '{no es json');
    expect(getPendingExpenses('u1')).toEqual([]);
  });

  it('si el almacenamiento falla al guardar no lanza error', () => {
    const espia = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('lleno');
    });
    expect(() => queuePendingExpense('u1', { monto: 1 })).not.toThrow();
    espia.mockRestore();
  });
});

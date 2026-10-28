import { describe, it, expect } from 'vitest';
import { limitarPorSaldo } from './weeklyPlan';

describe('limitarPorSaldo', () => {
  it('lo disponible de la semana no puede superar la plata real de la categoría', () => {
    const r = limitarPorSaldo({ estado: 'activo', disponible: 20000 }, 17000);
    expect(r.disponible).toBe(17000);
    expect(r.disponibleSinTope).toBe(20000);
    expect(r.limitadoPorSaldo).toBe(true);
  });
  it('si el saldo alcanza, no cambia nada', () => {
    const r = limitarPorSaldo({ estado: 'activo', disponible: 12000 }, 17000);
    expect(r.disponible).toBe(12000);
    expect(r.limitadoPorSaldo).toBe(false);
  });
  it('un presupuesto en déficit sigue en negativo', () => {
    expect(limitarPorSaldo({ estado: 'activo', disponible: -3000 }, 17000).disponible).toBe(-3000);
  });
  it('no toca presupuestos pendientes o terminados', () => {
    const pendiente = { estado: 'pendiente' };
    expect(limitarPorSaldo(pendiente, 0)).toBe(pendiente);
  });
});

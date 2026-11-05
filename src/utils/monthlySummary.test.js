import { describe, it, expect } from 'vitest';
import { buildMonthlySummary, resumenAutomaticoPendiente } from './monthlySummary';

const categories = [{ id: 'a', nombre: 'Comida' }, { id: 'b', nombre: 'Bencina' }];
const base = {
  monthKey: '2026-10',
  categories,
  expenses: [
    { category_id: 'a', fecha: '2026-09-10', monto: 40000 },
    { category_id: 'a', fecha: '2026-10-10', monto: 70000 },
    { category_id: 'b', fecha: '2026-09-12', monto: 30000 },
    { category_id: 'b', fecha: '2026-10-12', monto: 20000 },
  ],
};

describe('buildMonthlySummary', () => {
  it('compara cada categoría con el mes anterior', () => {
    const { comparacion } = buildMonthlySummary(base);
    expect(comparacion.hayMesAnterior).toBe(true);
    expect(comparacion.totalActual).toBe(90000);
    expect(comparacion.totalAnterior).toBe(70000);
    expect(comparacion.cambioPct).toBe(29);
    const comida = comparacion.porCategoria.find((r) => r.categoria.id === 'a');
    expect(comida).toMatchObject({ actual: 70000, anterior: 40000, delta: 30000 });
    // ordenadas por el cambio más grande primero
    expect(comparacion.porCategoria[0].categoria.id).toBe('a');
  });

  it('las compras con meta de ahorro cuentan en la comparación pero no suman al gastado', () => {
    const r = buildMonthlySummary({
      ...base,
      goals: [{ id: 'g', nombre: 'Celular', used_for: 'iPhone 14', used_at: '2026-10-20', completed_at: '2026-10-20T12:00:00Z' }],
      contributions: [{ goal_id: 'g', monto: 500000, fecha: '2026-08-01', source_category_id: 'a' }],
    });
    expect(r.totalGastado).toBe(90000);
    expect(r.totalComprasConAhorro).toBe(500000);
    expect(r.comparacion.totalActual).toBe(590000);
    expect(r.comprasConAhorro[0].nombre).toBe('iPhone 14');
  });

  it('sin mes anterior no hay comparación', () => {
    const r = buildMonthlySummary({ ...base, expenses: [{ category_id: 'a', fecha: '2026-10-10', monto: 1000 }] });
    expect(r.comparacion.hayMesAnterior).toBe(false);
  });

  it('el balance al cierre descuenta lo mandado a metas y las deudas con categoría', () => {
    const r = buildMonthlySummary({
      monthKey: '2026-10',
      categories,
      fundings: [{ category_id: 'a', monto: 100000, fecha: '2026-10-01' }],
      contributions: [{ goal_id: 'g', monto: 30000, fecha: '2026-10-05', source_category_id: 'a' }],
      debts: [{ tipo: 'prestado', monto: 10000, fecha: '2026-10-06', pagado: false, source_category_id: 'a' }],
    });
    expect(r.balanceAlCierre).toBe(60000);
  });
});

describe('resumenAutomaticoPendiente', () => {
  it('muestra el resumen del mes anterior si tiene movimientos y no se vio', () => {
    expect(resumenAutomaticoPendiente({ monthKey: '2026-11', closedMonths: ['2026-10', '2026-09'], yaVisto: null })).toBe('2026-10');
  });
  it('no lo vuelve a mostrar una vez visto', () => {
    expect(resumenAutomaticoPendiente({ monthKey: '2026-11', closedMonths: ['2026-10'], yaVisto: '2026-10' })).toBeNull();
  });
  it('no muestra nada si el mes anterior no tuvo movimientos, aunque haya meses más viejos', () => {
    expect(resumenAutomaticoPendiente({ monthKey: '2026-11', closedMonths: ['2026-08'], yaVisto: null })).toBeNull();
  });
  it('no se reabre aunque los datos carguen por partes (el último mes con datos cambia)', () => {
    const yaVisto = '2026-10';
    // Primero llegan solo los datos más viejos, después el resto: nunca vuelve a saltar.
    expect(resumenAutomaticoPendiente({ monthKey: '2026-11', closedMonths: ['2026-09'], yaVisto })).toBeNull();
    expect(resumenAutomaticoPendiente({ monthKey: '2026-11', closedMonths: ['2026-10', '2026-09'], yaVisto })).toBeNull();
  });
  it('en enero, el mes anterior es diciembre del año pasado', () => {
    expect(resumenAutomaticoPendiente({ monthKey: '2027-01', closedMonths: ['2026-12'], yaVisto: null })).toBe('2026-12');
  });
});

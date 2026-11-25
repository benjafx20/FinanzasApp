import { describe, it, expect } from 'vitest';
import { buildFinancialContext } from './buildFinancialContext';

const entrada = {
  expenses: [
    { fecha: '2026-11-03', monto: '1000.5', category_id: 'c1', nota: 'pan' },
    { fecha: '2026-11-04', monto: '2000', category_id: 'c1', nota: null },
    { fecha: '2026-10-01', monto: '9999', category_id: 'c2' },
    { fecha: '2026-11-05', monto: '300', category_id: 'zzz' },
  ],
  incomes: [{ fecha: '2026-11-01', monto: '50000', nota: 'sueldo' }],
  categories: [{ id: 'c1', nombre: 'Comida' }, { id: 'c2', nombre: 'Bencina' }],
  saldoPorCategoria: { c1: 1234.6 },
  asignadoPorCategoria: { c1: 5000 },
  debts: [
    { persona: 'Ana', tipo: 'debo', monto: '4000', pagado: false },
    { persona: 'Beto', tipo: 'prestado', monto: '1000', pagado: true },
  ],
  goals: [{ id: 'm1', nombre: 'Viaje', monto_objetivo: '100000' }],
  totalByGoal: () => 25000,
  balanceTotal: 12345.4,
  monthKey: '2026-11',
};

describe('buildFinancialContext (lo que se envia al asistente de IA)', () => {
  const ctx = buildFinancialContext(entrada);

  it('suma el gasto del mes por categoria y deja fuera otros meses', () => {
    expect(ctx.gastoDelMesActualPorCategoria).toEqual({ Comida: 3000.5, 'Sin categoria': 300 });
  });

  it('redondea saldos y balance', () => {
    expect(ctx.balanceTotal).toBe(12345);
    expect(ctx.categorias[0]).toEqual({ nombre: 'Comida', saldo: 1235, asignado: 5000 });
    expect(ctx.categorias[1]).toEqual({ nombre: 'Bencina', saldo: 0, asignado: 0 });
  });

  it('solo incluye deudas sin pagar', () => {
    expect(ctx.deudasActivas).toEqual([{ persona: 'Ana', tipo: 'debo', monto: 4000 }]);
  });

  it('incluye metas con lo acumulado e ingresos recientes', () => {
    expect(ctx.metasDeAhorro).toEqual([{ nombre: 'Viaje', objetivo: 100000, acumulado: 25000 }]);
    expect(ctx.ingresosRecientes[0]).toEqual({ fecha: '2026-11-01', monto: 50000, nota: 'sueldo' });
  });

  it('limita la cantidad de gastos recientes enviados', () => {
    const muchos = Array.from({ length: 200 }, (_, i) => ({ fecha: '2026-11-01', monto: '1', category_id: 'c1', nota: String(i) }));
    expect(buildFinancialContext({ ...entrada, expenses: muchos }).gastosRecientes).toHaveLength(60);
  });

  it('no incluye correo ni identificadores de usuario', () => {
    expect(JSON.stringify(ctx)).not.toMatch(/user_id|email|@/);
  });
});

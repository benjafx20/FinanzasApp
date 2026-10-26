import { describe, it, expect } from 'vitest';
import { calcularSaldos } from './balances';

const cats = [{ id: 'A' }, { id: 'B' }];

describe('calcularSaldos', () => {
  it('saldo = aportes + traspasos recibidos − enviados − gastos', () => {
    const { saldoPorCategoria, asignadoPorCategoria } = calcularSaldos({
      categories: cats,
      fundings: [{ category_id: 'A', monto: 100000 }],
      transfers: [{ from_category_id: 'A', to_category_id: 'B', monto: 30000 }],
      expenses: [{ category_id: 'A', funding_category_id: null, monto: 20000 }],
    });
    expect(saldoPorCategoria).toEqual({ A: 50000, B: 30000 });
    expect(asignadoPorCategoria).toEqual({ A: 70000, B: 30000 });
  });

  it('un gasto pagado con la plata de otra categoría baja el saldo de esa otra', () => {
    const { saldoPorCategoria } = calcularSaldos({
      categories: cats,
      fundings: [{ category_id: 'A', monto: 50000 }, { category_id: 'B', monto: 50000 }],
      expenses: [{ category_id: 'A', funding_category_id: 'B', monto: 10000 }],
    });
    expect(saldoPorCategoria).toEqual({ A: 50000, B: 40000 });
  });

  it('los aportes a metas bajan la categoría de origen; "plata de afuera" no baja nada', () => {
    const { saldoPorCategoria } = calcularSaldos({
      categories: cats,
      fundings: [{ category_id: 'A', monto: 100000 }],
      contributions: [
        { source_category_id: 'A', monto: 25000 },
        { source_category_id: null, monto: 99999 },
      ],
    });
    expect(saldoPorCategoria.A).toBe(75000);
  });

  it('las deudas con categoría mueven plata (negativo sale, positivo entra)', () => {
    const { saldoPorCategoria } = calcularSaldos({
      categories: cats,
      fundings: [{ category_id: 'A', monto: 100000 }],
      movimientosDeuda: [
        { category_id: 'A', monto: -50000 },
        { category_id: 'B', monto: 50000 },
      ],
    });
    expect(saldoPorCategoria).toEqual({ A: 50000, B: 50000 });
  });

  it('un gasto sin categoría no afecta ningún saldo', () => {
    const { saldoPorCategoria } = calcularSaldos({
      categories: cats,
      fundings: [{ category_id: 'A', monto: 1000 }],
      expenses: [{ category_id: null, funding_category_id: null, monto: 500 }],
    });
    expect(saldoPorCategoria.A).toBe(1000);
  });
});

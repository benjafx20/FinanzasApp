import { describe, it, expect } from 'vitest';
import { equiposSinVender } from './inventory';

const hoy = '2026-10-30';

describe('equiposSinVender', () => {
  it('un equipo con compras y sin ventas está sin vender, con costo y días desde la primera compra', () => {
    const r = equiposSinVender({
      categoryId: 'cel',
      hoy,
      expenses: [
        { category_id: 'cel', etiqueta: 'iPhone 12', fecha: '2026-10-10', monto: 200000 },
        { category_id: 'cel', etiqueta: 'iPhone 12', fecha: '2026-10-12', monto: 15000 }, // reparación
      ],
      fundings: [],
    });
    expect(r).toEqual([{ nombre: 'iPhone 12', costo: 215000, primeraCompra: '2026-10-10', dias: 20, atrasado: true }]);
  });

  it('un equipo con una venta (aporte con el mismo grupo) ya no está en inventario', () => {
    const r = equiposSinVender({
      categoryId: 'cel',
      hoy,
      expenses: [{ category_id: 'cel', etiqueta: 'Samsung A06', fecha: '2026-10-01', monto: 90000 }],
      fundings: [{ category_id: 'cel', etiqueta: 'samsung a06 ', monto: 120000 }],
    });
    expect(r).toEqual([]);
  });

  it('marca como atrasado solo desde los 15 días', () => {
    const base = { categoryId: 'cel', hoy, fundings: [] };
    const gasto = (fecha) => [{ category_id: 'cel', etiqueta: 'X', fecha, monto: 1000 }];
    expect(equiposSinVender({ ...base, expenses: gasto('2026-10-16') })[0].atrasado).toBe(false); // 14 días
    expect(equiposSinVender({ ...base, expenses: gasto('2026-10-15') })[0].atrasado).toBe(true); // 15 días
  });

  it('ignora otras categorías y gastos sin grupo', () => {
    const r = equiposSinVender({
      categoryId: 'cel',
      hoy,
      expenses: [
        { category_id: 'otra', etiqueta: 'X', fecha: '2026-10-01', monto: 1 },
        { category_id: 'cel', etiqueta: null, fecha: '2026-10-01', monto: 1 },
      ],
      fundings: [],
    });
    expect(r).toEqual([]);
  });
});

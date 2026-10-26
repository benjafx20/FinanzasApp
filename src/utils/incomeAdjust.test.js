import { describe, it, expect } from 'vitest';
import { calcularAjusteReparto } from './incomeAdjust';

const categorias = [{ id: 'A', nombre: 'Celulares' }, { id: 'B', nombre: 'Bencina' }];

describe('calcularAjusteReparto', () => {
  it('ajusta cada aporte en la misma proporción', () => {
    const { cambios } = calcularAjusteReparto({
      aportes: [{ id: 1, category_id: 'A', monto: 60000 }, { id: 2, category_id: 'B', monto: 40000 }],
      montoViejo: 100000,
      montoNuevo: 80000,
      categorias,
      saldoPorCategoria: { A: 60000, B: 40000 },
    });
    expect(cambios.map((c) => c.nuevo)).toEqual([48000, 32000]);
  });

  it('la suma queda exacta aunque haya redondeo', () => {
    const { cambios } = calcularAjusteReparto({
      aportes: [{ id: 1, category_id: 'A', monto: 33333 }, { id: 2, category_id: 'B', monto: 33333 }, { id: 3, category_id: 'A', monto: 33334 }],
      montoViejo: 100000,
      montoNuevo: 70001,
      categorias,
      saldoPorCategoria: {},
    });
    expect(cambios.reduce((s, c) => s + c.nuevo, 0)).toBe(Math.round(100000 * (70001 / 100000)));
  });

  it('avisa si una categoría quedaría en negativo', () => {
    const { advertencias } = calcularAjusteReparto({
      aportes: [{ id: 1, category_id: 'A', monto: 100000 }],
      montoViejo: 100000,
      montoNuevo: 50000,
      categorias,
      saldoPorCategoria: { A: 20000 }, // ya gastó casi todo
    });
    expect(advertencias).toEqual([{ categoria: 'Celulares', saldoDespues: -30000 }]);
  });

  it('falla si algún aporte quedaría en cero', () => {
    expect(() =>
      calcularAjusteReparto({
        aportes: [{ id: 1, category_id: 'A', monto: 1 }, { id: 2, category_id: 'B', monto: 99999 }],
        montoViejo: 100000,
        montoNuevo: 10,
        categorias,
        saldoPorCategoria: {},
      })
    ).toThrow();
  });
});

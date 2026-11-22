import { describe, it, expect } from 'vitest';
import { filaParaRestaurar } from './undoRestore';

describe('filaParaRestaurar', () => {
  it('deja solo las columnas de la tabla (sin la categoría unida ni "pending")', () => {
    const fila = {
      id: 'g1',
      monto: 5000,
      nota: null,
      category_id: 'c1',
      categories: { id: 'c1', nombre: 'Comida' },
      origen: { id: 'c1' },
      pending: false,
    };
    expect(filaParaRestaurar(fila)).toEqual({ id: 'g1', monto: 5000, nota: null, category_id: 'c1' });
  });
});

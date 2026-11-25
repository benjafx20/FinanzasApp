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

import { vi, beforeEach } from 'vitest';
import { restaurarFilas } from './undoRestore';

const insert = vi.fn();
vi.mock('./supabaseClient', () => ({ supabase: { from: () => ({ insert: (...a) => insert(...a) }) } }));

describe('restaurarFilas', () => {
  beforeEach(() => insert.mockReset());

  it('no llama a la base si no hay filas', async () => {
    await restaurarFilas('expenses', []);
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserta las filas limpias', async () => {
    insert.mockResolvedValue({ error: null });
    await restaurarFilas('expenses', [{ id: '1', monto: 5, pending: true, categories: { id: 'c' } }]);
    expect(insert).toHaveBeenCalledWith([{ id: '1', monto: 5 }]);
  });

  it('si la base falla lanza un error claro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    insert.mockResolvedValue({ error: { message: 'x' } });
    await expect(restaurarFilas('expenses', [{ id: '1' }])).rejects.toThrow('No se pudo deshacer');
  });
});

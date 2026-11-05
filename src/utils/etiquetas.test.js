import { describe, it, expect } from 'vitest';
import { etiquetasDe, renombrarEtiqueta } from './etiquetas';

describe('etiquetasDe', () => {
  const items = [
    { etiqueta: 'iPhone 12', category_id: 'cel' },
    { etiqueta: 'iPhone 12', category_id: 'cel' },
    { etiqueta: 'Bencina 93', category_id: 'auto' },
    { etiqueta: null, category_id: 'cel' },
  ];
  it('devuelve los grupos sin repetir', () => {
    expect(etiquetasDe(items)).toEqual(['iPhone 12', 'Bencina 93']);
  });
  it('puede filtrar por categoría', () => {
    expect(etiquetasDe(items, 'auto')).toEqual(['Bencina 93']);
  });
});

describe('renombrarEtiqueta', () => {
  const items = [
    { id: 1, etiqueta: 'iPhone 12', category_id: 'cel' },
    { id: 2, etiqueta: 'iPhone 12', category_id: 'otra' },
    { id: 3, etiqueta: 'Samsung', category_id: 'cel' },
  ];
  it('cambia el nombre solo en esa categoría y solo ese grupo', () => {
    const r = renombrarEtiqueta(items, 'cel', 'iPhone 12', 'iPhone 12 Pro');
    expect(r.map((x) => x.etiqueta)).toEqual(['iPhone 12 Pro', 'iPhone 12', 'Samsung']);
  });
});

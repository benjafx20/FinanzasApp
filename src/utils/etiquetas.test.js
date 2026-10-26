import { describe, it, expect } from 'vitest';
import { etiquetasDe } from './etiquetas';

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

import { describe, it, expect } from 'vitest';
import { searchAll } from './globalSearch';

const categorias = [{ id: 'c1', nombre: 'Bencina' }, { id: 'c2', nombre: 'Comida' }];
const gastos = [
  { id: 'g1', fecha: '2026-11-02', monto: '15000', nota: 'Copec', category_id: 'c1' },
  { id: 'g2', fecha: '2026-11-05', monto: '3000', nota: 'Pan', category_id: 'c2', etiqueta: 'Panadería' },
  { id: 'g3', fecha: '2026-10-01', monto: '500', nota: null, category_id: null },
];
const ingresos = [{ id: 'i1', fecha: '2026-11-01', monto: '100000', nota: 'Sueldo' }];
const deudas = [
  { id: 'd1', fecha: '2026-11-03', monto: '20000', persona: 'Carlos', tipo: 'prestado', nota: 'almuerzo' },
  { id: 'd2', fecha: '2026-11-04', monto: '8000', persona: 'Marta', tipo: 'debo', nota: null },
];

describe('searchAll', () => {
  it('con texto vacio no devuelve nada', () => {
    expect(searchAll({ query: '   ', expenses: gastos })).toEqual([]);
  });

  it('busca sin importar mayusculas ni tildes', () => {
    const r = searchAll({ query: 'PANADERIA', expenses: gastos, categories: categorias });
    expect(r.map((x) => x.id)).toEqual(['g2']);
  });

  it('encuentra por nombre de categoria y devuelve el monto como numero', () => {
    const r = searchAll({ query: 'bencina', expenses: gastos, categories: categorias });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tipo: 'gasto', monto: 15000, titulo: 'Bencina' });
  });

  it('un gasto sin categoria se llama "Sin categoría"', () => {
    const r = searchAll({ query: '500', expenses: [{ ...gastos[2], nota: '500 pesos' }], categories: categorias });
    expect(r[0].titulo).toBe('Sin categoría');
  });

  it('busca en ingresos y en deudas, y explica quien debe a quien', () => {
    const r = searchAll({ query: 'a', incomes: ingresos, debts: deudas });
    const ing = searchAll({ query: 'sueldo', incomes: ingresos, debts: deudas });
    expect(ing.map((x) => x.tipo)).toEqual(['ingreso']);
    expect(r.find((x) => x.id === 'd1').subtitulo).toBe('Le prestaste');
    expect(r.find((x) => x.id === 'd2').subtitulo).toBe('Le debes');
  });

  it('ordena del mas reciente al mas antiguo', () => {
    const r = searchAll({ query: 'a', expenses: gastos, incomes: ingresos, debts: deudas, categories: categorias });
    const fechas = r.map((x) => x.fecha);
    expect(fechas).toEqual([...fechas].sort().reverse());
  });
});

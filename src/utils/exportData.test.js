import { describe, it, expect } from 'vitest';
import { construirHojas } from './exportData';

const datos = {
  categories: [{ id: 'a', nombre: 'Celulares', es_inventario: true }],
  expenses: [{ fecha: '2026-10-01', monto: '90000', category_id: 'a', nota: 'Compra', etiqueta: 'Samsung', receipt_path: 'u/x.jpg' }],
  incomes: [{ id: 'i1', fecha: '2026-10-02', monto: 100000, nota: 'Venta' }],
  fundings: [{ income_id: 'i1', category_id: 'a', monto: 60000, fecha: '2026-10-02', origen: 'ingreso' }],
  goals: [{ id: 'g', nombre: 'Viaje', monto_objetivo: 500000, completed_at: null }],
  contributions: [{ goal_id: 'g', monto: 20000, fecha: '2026-10-03', source_category_id: 'a' }],
  saldoPorCategoria: { a: 12345 },
  fechaRespaldo: '2026-10-30',
};

describe('construirHojas', () => {
  const hojas = construirHojas(datos);
  const hoja = (nombre) => hojas.find((h) => h.nombre === nombre);

  it('trae una hoja por tipo de dato', () => {
    expect(hojas.map((h) => h.nombre)).toEqual([
      'Info', 'Gastos', 'Ingresos', 'Aportes a categorías', 'Movimientos entre cat.', 'Metas de ahorro',
      'Aportes a metas', 'Deudas y préstamos', 'Gastos recurrentes', 'Presupuestos semanales', 'Categorías',
    ]);
  });
  it('resuelve nombres de categoría y deja los montos como número', () => {
    const g = hoja('Gastos').filas[0];
    expect(g.Categoría).toBe('Celulares');
    expect(g.Monto).toBe(90000);
    expect(g['Tiene foto de boleta']).toBe('Sí');
  });
  it('calcula lo repartido y lo que falta repartir de un ingreso', () => {
    expect(hoja('Ingresos').filas[0]).toMatchObject({ Repartido: 60000, 'Sin repartir': 40000 });
  });
  it('calcula lo ahorrado de cada meta y el saldo de cada categoría', () => {
    expect(hoja('Metas de ahorro').filas[0]).toMatchObject({ Meta: 'Viaje', Ahorrado: 20000, Estado: 'En curso' });
    expect(hoja('Categorías').filas[0]).toMatchObject({ 'Saldo actual': 12345, 'Es inventario': 'Sí' });
  });
});

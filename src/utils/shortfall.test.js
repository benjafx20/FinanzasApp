import { describe, it, expect } from 'vitest';
import { calcularFaltante, opcionesParaCubrir } from './shortfall';

describe('calcularFaltante', () => {
  it('si tienes 17.000 y gastas 20.000, faltan 3.000', () => {
    expect(calcularFaltante({ saldo: 17000, monto: 20000 })).toBe(3000);
  });
  it('si alcanza, no falta nada', () => {
    expect(calcularFaltante({ saldo: 20000, monto: 20000 })).toBe(0);
    expect(calcularFaltante({ saldo: 50000, monto: 20000 })).toBe(0);
  });
  it('con saldo negativo, falta también lo que ya debías', () => {
    expect(calcularFaltante({ saldo: -5000, monto: 10000 })).toBe(15000);
  });
});

describe('opcionesParaCubrir', () => {
  const categorias = [{ id: 'a', nombre: 'Comida' }, { id: 'b', nombre: 'Ocio' }, { id: 'c', nombre: 'Ahorro' }];
  it('ofrece solo categorías con suficiente plata, la más llena primero, sin la propia', () => {
    const r = opcionesParaCubrir({
      categorias,
      saldoPorCategoria: { a: 1000, b: 5000, c: 90000 },
      excluirId: 'a',
      faltante: 3000,
    });
    expect(r.map((o) => o.id)).toEqual(['c', 'b']);
  });
  it('si ninguna alcanza, no ofrece nada', () => {
    expect(opcionesParaCubrir({ categorias, saldoPorCategoria: { a: 0, b: 100, c: 200 }, excluirId: 'a', faltante: 3000 })).toEqual([]);
  });
});

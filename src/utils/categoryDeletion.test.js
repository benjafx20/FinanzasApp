import { describe, it, expect } from 'vitest';
import { evaluarBorradoCategoria } from './categoryDeletion';

const cat = { nombre: 'Ocio' };

describe('evaluarBorradoCategoria', () => {
  it('bloquea si la categoría tiene saldo, positivo o negativo', () => {
    expect(evaluarBorradoCategoria(cat, { saldo: 15000 }).bloquear).toBe(true);
    expect(evaluarBorradoCategoria(cat, { saldo: -2000 }).bloquear).toBe(true);
  });
  it('con saldo cero lista lo que se pierde', () => {
    const r = evaluarBorradoCategoria(cat, { saldo: 0, gastos: 3, aportes: 2, planes: 1 });
    expect(r.bloquear).toBe(false);
    expect(r.mensaje).toContain('3 gasto(s)');
    expect(r.mensaje).toContain('2 aporte(s)');
    expect(r.mensaje).toContain('1 presupuesto(s)');
  });
  it('si no se usa en nada, solo pide confirmar', () => {
    const r = evaluarBorradoCategoria(cat, { saldo: 0 });
    expect(r).toEqual({ bloquear: false, mensaje: '¿Eliminar la categoría "Ocio"?' });
  });
});

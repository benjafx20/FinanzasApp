import { describe, it, expect } from 'vitest';
import { planearAjusteAhorro } from './goalAdjust';

const aportes = [
  { id: 'a', monto: 100, fecha: '2026-10-01' },
  { id: 'b', monto: 50, fecha: '2026-10-05' },
  { id: 'c', monto: 30, fecha: '2026-10-09' },
]; // total 180

describe('planearAjusteAhorro', () => {
  it('sin cambio no hace nada', () => {
    expect(planearAjusteAhorro({ aportes, nuevoTotal: 180 })).toEqual({ diff: 0, operaciones: [] });
  });
  it('si sube, agrega un aporte por la diferencia', () => {
    expect(planearAjusteAhorro({ aportes, nuevoTotal: 250 })).toEqual({ diff: 70, operaciones: [{ tipo: 'agregar', monto: 70 }] });
  });
  it('si baja, deshace los aportes más recientes primero', () => {
    const r = planearAjusteAhorro({ aportes, nuevoTotal: 120 }); // hay que quitar 60
    expect(r.diff).toBe(-60);
    expect(r.operaciones).toEqual([
      { tipo: 'borrar', id: 'c', monto: 30 },
      { tipo: 'reducir', id: 'b', monto: 20 },
    ]);
  });
  it('bajar a cero deshace todos los aportes', () => {
    expect(planearAjusteAhorro({ aportes, nuevoTotal: 0 }).operaciones.map((o) => o.id)).toEqual(['c', 'b', 'a']);
  });
  it('el nuevo total quedaría exacto', () => {
    const r = planearAjusteAhorro({ aportes, nuevoTotal: 95 });
    const quitado = r.operaciones.reduce((s, o) => {
      const original = aportes.find((a) => a.id === o.id).monto;
      return s + (original - (o.tipo === 'borrar' ? 0 : o.monto));
    }, 0);
    expect(180 - quitado).toBe(95);
  });
});

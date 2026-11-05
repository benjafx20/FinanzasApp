import { describe, it, expect } from 'vitest';
import { esMovimientoAutomatico, movimientosVisibles } from './transfers';

const manual = (id) => ({ id, nota: null });
const auto = (id) => ({ id, nota: 'Sobrante semana 2 (presupuesto semanal)' });
const cubrir = (id) => ({ id, nota: 'Para cubrir: Copec' });

describe('movimientos entre categorías', () => {
  it('reconoce los que crea solo el cierre semanal', () => {
    expect(esMovimientoAutomatico(auto(1))).toBe(true);
    expect(esMovimientoAutomatico(manual(2))).toBe(false);
    expect(esMovimientoAutomatico(cubrir(3))).toBe(false);
  });

  it('por defecto oculta los automáticos y muestra solo los últimos 5', () => {
    const lista = [auto(1), manual(2), cubrir(3), auto(4), manual(5), manual(6), manual(7), manual(8), manual(9)];
    const r = movimientosVisibles(lista);
    expect(r.map((t) => t.id)).toEqual([2, 3, 5, 6, 7]);
  });

  it('con "ver todos" muestra todo, incluso los automáticos', () => {
    const lista = [auto(1), manual(2), manual(3)];
    expect(movimientosVisibles(lista, { verTodos: true })).toHaveLength(3);
  });
});

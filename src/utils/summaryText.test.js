import { describe, it, expect } from 'vitest';
import { monthLabel, generarResumenConversado } from './summaryText';

const base = {
  monthKey: '2026-10',
  totalGastado: 100000,
  cambioPct: null,
  categoriaTop: null,
  categoriaTopMonto: 0,
  ahorroLogrado: 0,
  totalTeDebenAlCierre: 0,
  totalDebesAlCierre: 0,
  balanceAlCierre: 5000,
};
const texto = (frases) => frases.map((f) => f.map((p) => (typeof p === 'string' ? p : `$${p.monto}`)).join('')).join(' ');

describe('monthLabel', () => {
  it('escribe el mes en español con mayuscula', () => {
    expect(monthLabel('2026-03')).toBe('Marzo 2026');
    expect(monthLabel('2026-12')).toBe('Diciembre 2026');
  });
});

describe('generarResumenConversado', () => {
  it('siempre dice el total gastado y el balance', () => {
    const t = texto(generarResumenConversado(base));
    expect(t).toContain('Cerraste octubre');
    expect(t).toContain('Terminaste el mes con');
  });

  it.each([
    [-30, 'menos que el mes anterior — se nota'],
    [-10, 'Vas por buen camino'],
    [0, 'bastante parejo'],
    [10, 'un poco más'],
    [40, 'se te fue'],
  ])('comenta un cambio de %s%% respecto del mes anterior', (pct, esperado) => {
    expect(texto(generarResumenConversado({ ...base, cambioPct: pct }))).toContain(esperado);
  });

  it('menciona categoria top, ahorro y deudas cuando existen', () => {
    const t = texto(
      generarResumenConversado({
        ...base,
        categoriaTop: { nombre: 'Comida' },
        categoriaTopMonto: 40000,
        ahorroLogrado: 20000,
        totalTeDebenAlCierre: 5000,
        totalDebesAlCierre: 3000,
      })
    );
    expect(t).toContain('Comida');
    expect(t).toContain('metas de ahorro');
    expect(t).toContain('te debían');
  });

  it('con solo una deuda usa la frase correspondiente', () => {
    expect(texto(generarResumenConversado({ ...base, totalTeDebenAlCierre: 5000 }))).toContain('te seguían debiendo');
    expect(texto(generarResumenConversado({ ...base, totalDebesAlCierre: 3000 }))).toContain('tú debías');
  });

  it('avisa cuando el balance es negativo', () => {
    expect(texto(generarResumenConversado({ ...base, balanceAlCierre: -2000 }))).toContain('en rojo');
  });
});

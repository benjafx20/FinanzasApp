import { describe, it, expect } from 'vitest';
import { getCurrentMonthKey, getWeekRange, isInRange, isInMonth, getWeekKey, getCurrentWeekKey, isInWeekKey } from './dateHelpers';

describe('dateHelpers', () => {
  it('arma la clave del mes con cero a la izquierda', () => {
    expect(getCurrentMonthKey(new Date(2026, 0, 15))).toBe('2026-01');
    expect(getCurrentMonthKey(new Date(2026, 10, 24))).toBe('2026-11');
  });

  it('la semana va de lunes a domingo', () => {
    const { start, end } = getWeekRange(new Date(2026, 10, 24)); // martes
    expect(start.getDay()).toBe(1);
    expect(end.getDay()).toBe(0);
    expect(start.getDate()).toBe(23);
    expect(end.getDate()).toBe(29);
  });

  it('si hoy es domingo, la semana empieza el lunes anterior', () => {
    const { start, end } = getWeekRange(new Date(2026, 10, 29));
    expect(start.getDate()).toBe(23);
    expect(end.getDate()).toBe(29);
  });

  it('revisa si una fecha esta en un rango y en un mes', () => {
    const { start, end } = getWeekRange(new Date(2026, 10, 24));
    expect(isInRange('2026-11-25T12:00:00', start, end)).toBe(true);
    expect(isInRange('2026-12-01T12:00:00', start, end)).toBe(false);
    expect(isInMonth('2026-11-30', '2026-11')).toBe(true);
    expect(isInMonth('2026-12-01', '2026-11')).toBe(false);
  });

  it('la clave de semana sigue el calendario ISO', () => {
    expect(getWeekKey(new Date(2026, 0, 1))).toBe('2026-W01');
    expect(getWeekKey(new Date(2026, 11, 31))).toBe('2026-W53');
    expect(getCurrentWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
    expect(isInWeekKey('2026-11-24', getWeekKey(new Date(2026, 10, 25)))).toBe(true);
    expect(isInWeekKey('2026-11-02', getWeekKey(new Date(2026, 10, 25)))).toBe(false);
  });
});

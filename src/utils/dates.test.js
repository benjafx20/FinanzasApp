import { describe, it, expect } from 'vitest';
import { fechaLocalISO } from './dates';

describe('fechaLocalISO', () => {
  it('usa la fecha local, no la de UTC (a las 23:30 sigue siendo el mismo día)', () => {
    expect(fechaLocalISO(new Date(2026, 9, 11, 23, 30))).toBe('2026-10-11');
  });
  it('rellena mes y día con cero', () => {
    expect(fechaLocalISO(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

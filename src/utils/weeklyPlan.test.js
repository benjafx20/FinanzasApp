import { describe, it, expect } from 'vitest';
import { rangoSemana, fechaInicioPlan, calcularPlan } from './weeklyPlan';

// 2026-10-05 es lunes.
const plan = { id: 'p', category_id: 'c', monto_semanal: 20000, semanas: 4, fecha_inicio: '2026-10-05' };

describe('semanas', () => {
  it('la primera semana termina el primer domingo (puede ser corta)', () => {
    expect(rangoSemana('2026-10-01', 1)).toEqual({ ini: '2026-10-01', fin: '2026-10-04' });
    expect(rangoSemana('2026-10-01', 2)).toEqual({ ini: '2026-10-05', fin: '2026-10-11' });
  });
  it('"el lunes" desde un domingo parte al día siguiente; desde lunes, hoy', () => {
    expect(fechaInicioPlan('lunes', '2026-10-04')).toBe('2026-10-05');
    expect(fechaInicioPlan('lunes', '2026-10-05')).toBe('2026-10-05');
    expect(fechaInicioPlan('esta', '2026-10-08')).toBe('2026-10-08');
  });
});

describe('calcularPlan', () => {
  it('disponible = monto + aportes − gastado', () => {
    const r = calcularPlan(
      plan, [],
      [{ category_id: 'c', fecha: '2026-10-06', monto: 5000 }],
      [{ category_id: 'c', fecha: '2026-10-07', monto: 8000 }],
      '2026-10-08'
    );
    expect(r.disponible).toBe(23000);
    expect(r.aportes).toBe(8000);
  });

  it('cuenta lo que sale del saldo de la categoría (funding_category_id)', () => {
    const gastos = [
      { category_id: 'otra', funding_category_id: 'c', fecha: '2026-10-06', monto: 5000 },
      { category_id: 'c', funding_category_id: 'x', fecha: '2026-10-06', monto: 7000 },
      { category_id: 'c', funding_category_id: null, fecha: '2026-10-07', monto: 1000 },
    ];
    expect(calcularPlan(plan, [], gastos, [], '2026-10-08').gastado).toBe(6000);
  });

  it('si te pasas, el déficit se descuenta de la semana siguiente', () => {
    const gastos = [{ category_id: 'c', fecha: '2026-10-06', monto: 25000 }];
    const r = calcularPlan(plan, [], gastos, [], '2026-10-13'); // semana 2
    expect(r.semanaActual).toBe(2);
    expect(r.deuda).toBe(5000);
    expect(r.disponible).toBe(15000);
  });

  it('usa la deuda guardada por el cierre automático cuando existe', () => {
    const cierres = [{ semana_num: 1, deuda_arrastrada: 3000 }];
    const r = calcularPlan(plan, cierres, [], [], '2026-10-13');
    expect(r.deuda).toBe(3000);
    expect(r.disponible).toBe(17000);
  });

  it('antes de empezar está pendiente y después de la última semana, terminado', () => {
    expect(calcularPlan(plan, [], [], [], '2026-10-01').estado).toBe('pendiente');
    expect(calcularPlan(plan, [], [], [], '2026-11-02').estado).toBe('terminado');
  });
});

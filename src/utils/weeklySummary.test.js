import { describe, it, expect } from 'vitest';
import { resumenSemanaPasada } from './weeklySummary';

const plan = { id: 'p', category_id: 'c', monto_semanal: 20000, semanas: 4, fecha_inicio: '2026-10-05', estado: 'activo' };
const cierres = [{ id: 1, plan_id: 'p', semana_num: 1 }]; // semana 1 termina el domingo 2026-10-11

describe('resumenSemanaPasada', () => {
  it('muestra la semana que cerró hasta el sábado siguiente', () => {
    expect(resumenSemanaPasada([plan], cierres, '2026-10-12')).toHaveLength(1); // lunes
    expect(resumenSemanaPasada([plan], cierres, '2026-10-17')).toHaveLength(1); // sábado
  });
  it('ya no la muestra el domingo siguiente, ni antes de que cierre', () => {
    expect(resumenSemanaPasada([plan], cierres, '2026-10-18')).toHaveLength(0);
    expect(resumenSemanaPasada([plan], cierres, '2026-10-11')).toHaveLength(0);
  });
  it('ignora presupuestos apagados', () => {
    expect(resumenSemanaPasada([{ ...plan, estado: 'apagado' }], cierres, '2026-10-12')).toHaveLength(0);
  });
});

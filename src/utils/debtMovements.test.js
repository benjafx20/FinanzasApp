import { describe, it, expect } from 'vitest';
import { movimientosDeDeudas } from './debtMovements';

describe('movimientosDeDeudas', () => {
  it('un préstamo sale al prestar y entra al ser devuelto', () => {
    const m = movimientosDeDeudas([
      { tipo: 'prestado', monto: 50000, fecha: '2026-10-01', pagado: true, fecha_pago: '2026-10-10', source_category_id: 'A', destination_category_id: 'B' },
    ]);
    expect(m).toEqual([
      { category_id: 'A', monto: -50000, fecha: '2026-10-01' },
      { category_id: 'B', monto: 50000, fecha: '2026-10-10' },
    ]);
  });
  it('un préstamo sin categoría es solo registro', () => {
    expect(movimientosDeDeudas([{ tipo: 'prestado', monto: 20000, fecha: '2026-10-02', pagado: false, source_category_id: null }])).toEqual([]);
  });
  it('una deuda tuya solo mueve plata cuando la pagas', () => {
    const d = { tipo: 'debo', monto: 30000, fecha: '2026-10-03', source_category_id: 'A' };
    expect(movimientosDeDeudas([{ ...d, pagado: false }])).toEqual([]);
    expect(movimientosDeDeudas([{ ...d, pagado: true, fecha_pago: '2026-10-12' }])).toEqual([
      { category_id: 'A', monto: -30000, fecha: '2026-10-12' },
    ]);
  });
});

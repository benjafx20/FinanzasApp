import { describe, it, expect, vi, beforeEach } from 'vitest';

const refrescar = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { refreshSession: refrescar } }),
}));

import { withSessionRetry } from './supabaseClient';

beforeEach(() => refrescar.mockReset());

describe('withSessionRetry', () => {
  it('si la consulta sale bien, no refresca la sesion', async () => {
    const consulta = vi.fn().mockResolvedValue({ data: [1], error: null });
    const r = await withSessionRetry(consulta);
    expect(r.data).toEqual([1]);
    expect(refrescar).not.toHaveBeenCalled();
  });

  it('si el token vencio, refresca y repite la consulta una vez', async () => {
    refrescar.mockResolvedValue({ error: null });
    const consulta = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { status: 401, message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: [2], error: null });
    const r = await withSessionRetry(consulta);
    expect(r.data).toEqual([2]);
    expect(consulta).toHaveBeenCalledTimes(2);
  });

  it('si no se puede refrescar, devuelve el error original', async () => {
    refrescar.mockResolvedValue({ error: new Error('no') });
    const consulta = vi.fn().mockResolvedValue({ data: null, error: { message: 'token is expired' } });
    const r = await withSessionRetry(consulta);
    expect(r.error.message).toBe('token is expired');
    expect(consulta).toHaveBeenCalledTimes(1);
  });

  it('otros errores (por ejemplo una regla de la base) no gatillan el refresco', async () => {
    const consulta = vi.fn().mockResolvedValue({ data: null, error: { status: 400, message: 'violates check constraint' } });
    await withSessionRetry(consulta);
    expect(refrescar).not.toHaveBeenCalled();
  });
});

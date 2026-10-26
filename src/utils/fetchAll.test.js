import { describe, it, expect } from 'vitest';
import { fetchAllPages } from '../lib/fetchAll';

// Consulta falsa que respeta .range(), como Supabase.
const consultaFalsa = (total) => () => ({
  range: async (desde, hasta) => ({
    data: Array.from({ length: Math.max(0, Math.min(total, hasta + 1) - desde) }, (_, i) => ({ id: desde + i })),
    error: null,
  }),
});

describe('fetchAllPages', () => {
  it('trae todas las filas aunque pasen del tope de una página', async () => {
    const { data, error } = await fetchAllPages(consultaFalsa(2500), 1000);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(data[0].id).toBe(0);
    expect(data[2499].id).toBe(2499);
  });
  it('funciona con exactamente un múltiplo de la página y con listas vacías', async () => {
    expect((await fetchAllPages(consultaFalsa(2000), 1000)).data).toHaveLength(2000);
    expect((await fetchAllPages(consultaFalsa(0), 1000)).data).toEqual([]);
  });
  it('si una página falla, devuelve el error', async () => {
    const r = await fetchAllPages(() => ({ range: async () => ({ data: null, error: { message: 'boom' } }) }));
    expect(r.error.message).toBe('boom');
  });
});

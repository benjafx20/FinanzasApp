// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('../lib/supabaseClient', () => ({ supabase: { functions: { invoke: (...a) => invoke(...a) } } }));
const consentimiento = vi.fn();
vi.mock('./privacidad', () => ({ asegurarConsentimientoIA: (...a) => consentimiento(...a) }));

import { askAssistant } from './askAssistant';
import { scanReceipt } from './scanReceipt';

beforeEach(() => {
  invoke.mockReset();
  consentimiento.mockReset();
  consentimiento.mockResolvedValue();
});

describe('askAssistant', () => {
  it('pide consentimiento y devuelve la respuesta', async () => {
    invoke.mockResolvedValue({ data: { ok: true, respuesta: 'hola' }, error: null });
    expect(await askAssistant({ context: 'c', messages: [] })).toBe('hola');
    expect(consentimiento).toHaveBeenCalledWith('ia_asistente');
  });

  it('si no hay consentimiento, no llama a la funcion', async () => {
    consentimiento.mockRejectedValue(new Error('Sin tu permiso'));
    await expect(askAssistant({ context: 'c', messages: [] })).rejects.toThrow('Sin tu permiso');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('error de red da un mensaje claro', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(askAssistant({ context: 'c', messages: [] })).rejects.toThrow('No se pudo consultar');
  });

  it('muestra el error que devuelve el servidor', async () => {
    invoke.mockResolvedValue({ data: { ok: false, error: 'Límite diario' }, error: null });
    await expect(askAssistant({ context: 'c', messages: [] })).rejects.toThrow('Límite diario');
  });
});

describe('scanReceipt', () => {
  const instalarImagen = (ancho, alto, falla = false) => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = vi.fn();
    globalThis.Image = class {
      set src(_v) {
        this.width = ancho;
        this.height = alto;
        setTimeout(() => (falla ? this.onerror() : this.onload()));
      }
    };
    const ctx = { drawImage: vi.fn() };
    const canvas = { getContext: () => ctx, toDataURL: vi.fn(() => 'data:image/jpeg;base64,AAAA') };
    vi.spyOn(document, 'createElement').mockImplementation((t) => (t === 'canvas' ? canvas : document.createElementNS('http://www.w3.org/1999/xhtml', t)));
    return canvas;
  };

  it('pide consentimiento, achica la foto y devuelve los datos', async () => {
    const canvas = instalarImagen(4000, 1000);
    invoke.mockResolvedValue({ data: { ok: true, monto: 5990, fecha: '2026-11-01', comercio: 'Lider', categoriaId: 'c1' }, error: null });
    const r = await scanReceipt(new Blob(['x']), [{ id: 'c1', nombre: 'Comida', extra: 1 }]);
    expect(consentimiento).toHaveBeenCalledWith('ia_boletas');
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(500);
    expect(invoke.mock.calls[0][1].body.categorias).toEqual([{ id: 'c1', nombre: 'Comida' }]);
    expect(r).toMatchObject({ monto: 5990, fecha: '2026-11-01', comercio: 'Lider', categoryId: 'c1' });
    expect(r.imagen).toBeInstanceOf(Blob);
  });

  it('achica tambien las fotos altas', async () => {
    const canvas = instalarImagen(1000, 4000);
    invoke.mockResolvedValue({ data: { ok: true, monto: 1, fecha: null }, error: null });
    const r = await scanReceipt(new Blob(['x']));
    expect(canvas.height).toBe(2000);
    expect(canvas.width).toBe(500);
    expect(r.comercio).toBeNull();
    expect(r.categoryId).toBeNull();
  });

  it('no toca las fotos chicas', async () => {
    const canvas = instalarImagen(800, 600);
    invoke.mockResolvedValue({ data: { ok: true, monto: 1, fecha: null }, error: null });
    await scanReceipt(new Blob(['x']));
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('si la foto no se puede leer lanza error', async () => {
    instalarImagen(1, 1, true);
    await expect(scanReceipt(new Blob(['x']))).rejects.toThrow('No se pudo leer la foto');
  });

  it('errores del servidor se traducen a mensajes claros', async () => {
    instalarImagen(10, 10);
    invoke.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(scanReceipt(new Blob(['x']))).rejects.toThrow('No se pudo leer la boleta');
    invoke.mockResolvedValue({ data: { ok: false, error: 'Sin cuota' }, error: null });
    await expect(scanReceipt(new Blob(['x']))).rejects.toThrow('Sin cuota');
  });
});

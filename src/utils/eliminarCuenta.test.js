// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
const signOut = vi.fn();
vi.mock('../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: (...a) => invoke(...a) }, auth: { signOut: () => signOut() } },
}));
const pedirTexto = vi.fn();
const alertar = vi.fn();
vi.mock('./dialogs', () => ({ pedirTexto: (...a) => pedirTexto(...a), alertar: (...a) => alertar(...a) }));

import { eliminarCuenta, PALABRA_CONFIRMAR } from './eliminarCuenta';

beforeEach(() => {
  invoke.mockReset();
  signOut.mockReset();
  pedirTexto.mockReset();
  alertar.mockReset();
  localStorage.clear();
});

describe('eliminarCuenta', () => {
  it('si el usuario cancela no hace nada', async () => {
    pedirTexto.mockResolvedValue(null);
    expect(await eliminarCuenta('u1')).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('si escribe otra palabra avisa y no borra', async () => {
    pedirTexto.mockResolvedValue('borrar');
    expect(await eliminarCuenta('u1')).toBe(false);
    expect(alertar).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('con la palabra correcta borra en el servidor, limpia el dispositivo y cierra sesion', async () => {
    pedirTexto.mockResolvedValue(` ${PALABRA_CONFIRMAR} `);
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    localStorage.setItem('cola:u1', 'x');
    localStorage.setItem('cola:u2', 'y');
    expect(await eliminarCuenta('u1')).toBe(true);
    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { confirmar: PALABRA_CONFIRMAR } });
    expect(localStorage.getItem('cola:u1')).toBeNull();
    expect(localStorage.getItem('cola:u2')).toBe('y');
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('si el servidor falla, lanza error y NO cierra sesion ni borra datos locales', async () => {
    pedirTexto.mockResolvedValue(PALABRA_CONFIRMAR);
    invoke.mockResolvedValue({ data: { ok: false, error: 'fallo' }, error: null });
    localStorage.setItem('cola:u1', 'x');
    await expect(eliminarCuenta('u1')).rejects.toThrow('fallo');
    expect(signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem('cola:u1')).toBe('x');
  });

  it('si la llamada falla sin mensaje usa el texto por defecto', async () => {
    pedirTexto.mockResolvedValue(PALABRA_CONFIRMAR);
    invoke.mockResolvedValue({ data: null, error: { message: 'red' } });
    await expect(eliminarCuenta('u1')).rejects.toThrow('No se pudo eliminar la cuenta');
  });
});

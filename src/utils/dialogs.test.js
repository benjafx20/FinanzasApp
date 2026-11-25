// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { registerDialogHost, alertar, confirmar, pedirTexto, cubrirFaltante } from './dialogs';

afterEach(() => vi.restoreAllMocks());

describe('dialogos sin ventana propia (caen a los nativos)', () => {
  it('alertar usa window.alert', async () => {
    const a = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await alertar('hola');
    expect(a).toHaveBeenCalledWith('hola');
  });
  it('confirmar devuelve lo que responde window.confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(await confirmar('¿seguro?')).toBe(true);
  });
  it('pedirTexto devuelve lo que responde window.prompt', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Nombre');
    expect(await pedirTexto({ titulo: 't' })).toBe('Nombre');
  });
  it('cubrirFaltante: aceptar seguir devuelve negativo y cancelar devuelve null', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(await cubrirFaltante({ mensaje: 'm' })).toEqual({ accion: 'negativo' });
    expect(await cubrirFaltante({ mensaje: 'm' })).toBeNull();
  });
});

describe('dialogos con ventana propia', () => {
  it('manda la configuracion al host y resuelve con su respuesta', async () => {
    const host = vi.fn((cfg) => cfg.resolve(true));
    const quitar = registerDialogHost(host);
    expect(await confirmar('¿Eliminar este gasto?')).toBe(true);
    expect(host.mock.calls[0][0]).toMatchObject({ tipo: 'confirm', peligro: true, titulo: 'Confirmar' });
    quitar();
  });
  it('las preguntas normales no son peligrosas', async () => {
    const host = vi.fn((cfg) => cfg.resolve(true));
    const quitar = registerDialogHost(host);
    await confirmar('¿Guardar?', { titulo: 'X', textoConfirmar: 'Si' });
    expect(host.mock.calls[0][0]).toMatchObject({ peligro: false, titulo: 'X', textoConfirmar: 'Si' });
    quitar();
  });
  it('al quitar el host vuelve a los nativos', async () => {
    const host = vi.fn((cfg) => cfg.resolve());
    registerDialogHost(host)();
    const a = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await alertar('x');
    expect(host).not.toHaveBeenCalled();
    expect(a).toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

const signOut = vi.fn();
vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { signOut: (...a) => signOut(...a) } },
}));

import { PinGate } from './PinGate';
import { setPin, hasPin } from '../../utils/pinLock';

const U = 'u1';

function app(props = {}) {
  return render(
    <PinGate userId={U} {...props}>
      <div data-testid="contenido">Saldo secreto</div>
    </PinGate>
  );
}

const teclear = (pin) => pin.split('').forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

function ponerVisibilidad(estado) {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  localStorage.clear();
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  ponerVisibilidad('visible');
});

describe('PinGate', () => {
  it('sin PIN no bloquea nada', () => {
    app();
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
    expect(screen.getByTestId('contenido').closest('[inert]')).toBeNull();
  });

  it('al abrir la app con PIN pide el PIN y deja la app inactiva debajo', async () => {
    await setPin(U, '1234');
    app();
    expect(screen.getByText('Ingresa tu PIN')).toBeTruthy();
    expect(screen.getByTestId('contenido').closest('[inert]')).not.toBeNull();
  });

  it('justo después de iniciar sesión (startLocked=false) no lo pide', async () => {
    await setPin(U, '1234');
    app({ startLocked: false });
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
  });

  it('PIN correcto desbloquea', async () => {
    await setPin(U, '1234');
    app();
    teclear('1234');
    await waitFor(() => expect(screen.queryByText('Ingresa tu PIN')).toBeNull());
    expect(screen.getByTestId('contenido').closest('[inert]')).toBeNull();
  });

  it('PIN incorrecto avisa cuántos intentos quedan y limpia los puntos', async () => {
    await setPin(U, '1234');
    app();
    teclear('9999');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Te quedan 4 intentos'));
    expect(screen.getByText('Ingresa tu PIN')).toBeTruthy();
  });

  it('tras 5 fallos bloquea el teclado con cuenta regresiva', async () => {
    await setPin(U, '1234');
    app();
    for (let i = 0; i < 5; i++) {
      teclear('9999');
      await waitFor(() => expect(screen.getByRole('button', { name: '1' })).toBeTruthy());
      // espera a que termine la verificación antes del siguiente intento
      await act(async () => {});
    }
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Espera \d+ s/));
    expect(screen.getByRole('button', { name: '1' }).disabled).toBe(true);
  });

  it('vuelve a pedir el PIN tras 60 s o más en segundo plano', async () => {
    await setPin(U, '1234');
    app({ startLocked: false });
    const ahora = Date.now();
    const spy = vi.spyOn(Date, 'now');
    spy.mockReturnValue(ahora);
    act(() => ponerVisibilidad('hidden'));
    spy.mockReturnValue(ahora + 61_000);
    act(() => ponerVisibilidad('visible'));
    expect(screen.getByText('Ingresa tu PIN')).toBeTruthy();
    spy.mockRestore();
  });

  it('NO lo pide si estuvo menos de 60 s en segundo plano', async () => {
    await setPin(U, '1234');
    app({ startLocked: false });
    const ahora = Date.now();
    const spy = vi.spyOn(Date, 'now');
    spy.mockReturnValue(ahora);
    act(() => ponerVisibilidad('hidden'));
    spy.mockReturnValue(ahora + 30_000);
    act(() => ponerVisibilidad('visible'));
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
    spy.mockRestore();
  });

  it('Olvidé mi PIN: confirma, cierra sesión local y quita el PIN', async () => {
    await setPin(U, '1234');
    app();
    fireEvent.click(screen.getByText('Olvidé mi PIN'));
    expect(screen.getByText(/se cerrará tu sesión/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Cerrar sesión y quitar el PIN'));
    await waitFor(() => expect(hasPin(U)).toBe(false));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('Olvidé mi PIN: si falla el cierre de sesión, el PIN NO se quita', async () => {
    await setPin(U, '1234');
    signOut.mockResolvedValue({ error: new Error('x') });
    app();
    fireEvent.click(screen.getByText('Olvidé mi PIN'));
    fireEvent.click(screen.getByText('Cerrar sesión y quitar el PIN'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No se pudo cerrar la sesión'));
    expect(hasPin(U)).toBe(true);
  });

  it('quitar el PIN desde Ajustes desbloquea al tiro', async () => {
    await setPin(U, '1234');
    app();
    const { removePin } = await import('../../utils/pinLock');
    act(() => removePin(U));
    await waitFor(() => expect(screen.queryByText('Ingresa tu PIN')).toBeNull());
  });
});

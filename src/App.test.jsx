// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const auth = vi.hoisted(() => ({ valor: {} }));
vi.mock('./hooks/useAuth', () => ({ useAuth: () => auth.valor }));
vi.mock('./lib/supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('./pages/Dashboard', () => ({ Dashboard: () => <div>Mis saldos</div> }));
vi.mock('./pages/AuthPage', () => ({ AuthPage: () => <div>Iniciar sesión</div> }));
vi.mock('./pages/ResetPasswordPage', () => ({ ResetPasswordPage: () => <div>Nueva contraseña</div> }));

import App from './App';
import { setPin } from './utils/pinLock';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  auth.valor = { user: { id: 'u1' }, loading: false, passwordRecovery: false, sesionRestaurada: true };
});

describe('App + bloqueo con PIN', () => {
  it('sin sesión muestra el login', () => {
    auth.valor = { user: null, loading: false, passwordRecovery: false, sesionRestaurada: false };
    render(<App />);
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('sin PIN, entra directo', () => {
    render(<App />);
    expect(screen.getByText('Mis saldos')).toBeTruthy();
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
  });

  it('al abrir la app con sesión guardada y PIN: pide el PIN', async () => {
    await setPin('u1', '1234');
    render(<App />);
    expect(screen.getByText('Ingresa tu PIN')).toBeTruthy();
  });

  it('justo después de escribir correo y contraseña: NO pide el PIN', async () => {
    await setPin('u1', '1234');
    auth.valor = { user: { id: 'u1' }, loading: false, passwordRecovery: false, sesionRestaurada: false };
    render(<App />);
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
    expect(screen.getByText('Mis saldos')).toBeTruthy();
  });

  it('el PIN de una cuenta no bloquea a otra', async () => {
    await setPin('otra-cuenta', '1234');
    render(<App />);
    expect(screen.queryByText('Ingresa tu PIN')).toBeNull();
  });

  it('la recuperación de contraseña tiene prioridad sobre el PIN', async () => {
    await setPin('u1', '1234');
    auth.valor = { user: { id: 'u1' }, loading: false, passwordRecovery: true, sesionRestaurada: true };
    render(<App />);
    expect(screen.getByText('Nueva contraseña')).toBeTruthy();
  });
});

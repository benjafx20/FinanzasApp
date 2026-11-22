// @vitest-environment jsdom
// Prueba de humo: monta el Dashboard COMPLETO (con todos sus hooks reales) contra un
// servidor falso en memoria, y recorre lo nuevo: aviso de pendientes, sincronización
// al volver la señal, y el PIN desde Ajustes.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react';

const db = vi.hoisted(() => ({ tablas: {}, caido: false }));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'benja@test.cl' }, signOut: vi.fn() }),
}));

vi.mock('../lib/supabaseClient', () => {
  const cadena = (tabla) => {
    let modo = 'lista';
    const filas = () => db.tablas[tabla] || [];
    const resolver = () => {
      if (db.caido) return { data: null, error: { message: 'Failed to fetch' } };
      if (modo === 'uno') return { data: filas()[0] ?? null, error: null };
      return { data: [...filas()], error: null };
    };
    const c = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') return (ok, fail) => Promise.resolve(resolver()).then(ok, fail);
          if (prop === 'single' || prop === 'maybeSingle') return () => ((modo = 'uno'), c);
          if (prop === 'insert')
            return (payload) => {
              const lista = Array.isArray(payload) ? payload : [payload];
              if (db.caido) return cadena('__caido');
              db.tablas[tabla] = [...(db.tablas[tabla] || []), ...lista.map((f) => ({ created_at: new Date().toISOString(), ...f }))];
              return c;
            };
          return () => c;
        },
      }
    );
    return c;
  };
  const supabase = {
    from: (t) => cadena(t),
    auth: { refreshSession: async () => ({}), getSession: async () => ({ data: { session: null } }) },
    storage: { from: () => ({ upload: async () => ({}), remove: async () => ({}), createSignedUrl: async () => ({ data: null }) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }),
  };
  return { supabase, withSessionRetry: (fn) => fn() };
});

import { Dashboard } from './Dashboard';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { PrivacyProvider } from '../context/PrivacyContext.jsx';
import { DialogHost } from '../components/DialogHost.jsx';
import { ToastHost } from '../components/ToastHost.jsx';
import { encolar, leerCola } from '../utils/offlineOps';
import { hasPin } from '../utils/pinLock';

// Igual que main.jsx: la app va dentro de sus proveedores.
const montar = () =>
  render(
    <ThemeProvider>
      <PrivacyProvider>
        <Dashboard />
        <DialogHost />
        <ToastHost />
      </PrivacyProvider>
    </ThemeProvider>
  );

const hoy = new Date().toISOString().slice(0, 10);

function enLinea(v) {
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });
  db.caido = !v;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
  window.scrollTo = vi.fn();
  window.matchMedia ||= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  db.tablas = {
    categories: [
      { id: 'catA', nombre: 'Comida', icono: 'utensils', color: '#c96b5f', user_id: null },
      { id: 'catB', nombre: 'Transporte', icono: 'car', color: '#5e7d6d', user_id: null },
    ],
    onboarding: [],
  };
  localStorage.setItem('finanzas_onboarding_done_u1', '1');
  enLinea(true);
});

const esperarCarga = () => waitFor(() => expect(screen.queryByText(/Cargando/i)).toBeNull(), { timeout: 4000 });

describe('Dashboard completo', () => {
  it('monta sin errores y muestra el encabezado y las categorías', async () => {
    const errores = vi.spyOn(console, 'error').mockImplementation(() => {});
    montar();
    await esperarCarga();
    expect(screen.getByLabelText('Ajustes y respaldo')).toBeTruthy();
    expect((await screen.findAllByText('Comida')).length).toBeGreaterThan(0);
    const graves = errores.mock.calls.filter((c) => /Cannot read|is not defined|is not a function|Minified React/.test(String(c[0])));
    expect(graves).toEqual([]);
    errores.mockRestore();
  });

  it('con pendientes sin señal: avisa, y al volver la señal los sube y el aviso desaparece', async () => {
    enLinea(false);
    encolar('u1', 'income', { id: 'inc-1', user_id: 'u1', monto: 40000, fecha: hoy, nota: 'Venta' });
    encolar('u1', 'funding', { id: 'fun-1', user_id: 'u1', category_id: 'catA', monto: 40000, origen: 'ingreso', income_id: 'inc-1', fecha: hoy });
    encolar('u1', 'contribution', { id: 'con-1', goal_id: 'g1', user_id: 'u1', monto: 1000, fecha: hoy });

    montar();
    await esperarCarga();
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
    expect(await screen.findByText(/3 movimientos por subir cuando vuelva la señal/)).toBeTruthy();

    // Vuelve la señal
    enLinea(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(leerCola('u1')).toHaveLength(0), { timeout: 4000 });
    expect(db.tablas.incomes.map((i) => i.id)).toEqual(['inc-1']);
    expect(db.tablas.category_fundings.map((i) => i.id)).toEqual(['fun-1']);
    expect(db.tablas.savings_contributions.map((i) => i.id)).toEqual(['con-1']);
    await waitFor(() => expect(screen.queryByText(/por subir/)).toBeNull());
    expect(screen.queryByText(/Sin conexión —/)).toBeNull();
  });

  it('Ajustes: se puede activar el PIN desde la pantalla', async () => {
    montar();
    await esperarCarga();
    fireEvent.click(screen.getByLabelText('Ajustes y respaldo'));
    expect(await screen.findByText('Bloqueo con PIN')).toBeTruthy();
    fireEvent.click(screen.getByText('Activar PIN'));
    fireEvent.change(screen.getByLabelText('PIN (4 números)'), { target: { value: '4821' } });
    fireEvent.change(screen.getByLabelText('Repite el PIN'), { target: { value: '4821' } });
    fireEvent.click(screen.getByText('Guardar PIN'));
    await waitFor(() => expect(hasPin('u1')).toBe(true));
  });

  it('Ajustes: PIN distinto en la repetición no se guarda', async () => {
    montar();
    await esperarCarga();
    fireEvent.click(screen.getByLabelText('Ajustes y respaldo'));
    fireEvent.click(await screen.findByText('Activar PIN'));
    fireEvent.change(screen.getByLabelText('PIN (4 números)'), { target: { value: '4821' } });
    fireEvent.change(screen.getByLabelText('Repite el PIN'), { target: { value: '1111' } });
    fireEvent.click(screen.getByText('Guardar PIN'));
    expect(await screen.findByText('Los dos PIN no coinciden.')).toBeTruthy();
    expect(hasPin('u1')).toBe(false);
  });
});

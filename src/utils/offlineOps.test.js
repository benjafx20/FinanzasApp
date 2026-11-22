// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encolar,
  leerCola,
  mezclarConPendientes,
  estaPendiente,
  quitarOp,
  actualizarOp,
  descartarFallidas,
  resumenCola,
  esErrorDeRed,
  insertarOEncolar,
  hayAportesPendientesDeIngreso,
  renombrarEtiquetaEnCola,
} from './offlineOps';

const U = 'u1';
const ingreso = { id: 'inc-1', user_id: U, monto: 50000, fecha: '2026-11-20', nota: 'Venta' };
const aporte = (over = {}) => ({ id: 'fun-1', user_id: U, category_id: 'cat-A', monto: 30000, origen: 'ingreso', income_id: 'inc-1', fecha: '2026-11-20', ...over });

function simularRed(enLinea) {
  Object.defineProperty(navigator, 'onLine', { value: enLinea, configurable: true });
}

beforeEach(() => {
  localStorage.clear();
  simularRed(true);
});
afterEach(() => simularRed(true));

describe('cola de operaciones sin conexión', () => {
  it('encolar devuelve una fila fantasma con su id definitivo y la guarda', () => {
    const f = encolar(U, 'income', ingreso);
    expect(f).toMatchObject({ id: 'inc-1', monto: 50000, pending: true });
    expect(leerCola(U)).toHaveLength(1);
    expect(estaPendiente(U, 'inc-1')).toBe(true);
  });

  it('crea un id si no viene uno', () => {
    const { id: _quitado, ...sinId } = ingreso;
    const f = encolar(U, 'income', sinId);
    expect(f.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('las filas pendientes se muestran primero y no se repiten si el servidor ya las tiene', () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'income', { ...ingreso, id: 'inc-2' });
    const servidor = [{ id: 'inc-2', monto: 50000 }, { id: 'inc-0', monto: 1 }];
    const lista = mezclarConPendientes(U, 'income', servidor);
    expect(lista.map((x) => x.id)).toEqual(['inc-1', 'inc-2', 'inc-0']);
    expect(lista.find((x) => x.id === 'inc-2').pending).toBeUndefined(); // la versión del servidor manda
  });

  it('solo mezcla las filas del tipo pedido', () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte());
    expect(mezclarConPendientes(U, 'funding', []).map((x) => x.id)).toEqual(['fun-1']);
  });

  it('cada usuario tiene su propia cola', () => {
    encolar(U, 'income', ingreso);
    expect(leerCola('otro')).toEqual([]);
  });

  it('quitarOp y actualizarOp', () => {
    encolar(U, 'income', ingreso);
    actualizarOp(U, 'inc-1', { intentos: 2 });
    expect(leerCola(U)[0].intentos).toBe(2);
    quitarOp(U, 'inc-1');
    expect(leerCola(U)).toEqual([]);
  });

  it('descartar los fallidos también descarta el reparto que colgaba de ese ingreso', () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte());
    encolar(U, 'income', { ...ingreso, id: 'inc-9' });
    actualizarOp(U, 'inc-1', { fallida: true });
    expect(descartarFallidas(U)).toBe(2);
    expect(leerCola(U).map((o) => o.payload.id)).toEqual(['inc-9']);
  });

  it('resumenCola cuenta total y fallidas', () => {
    encolar(U, 'income', ingreso);
    encolar(U, 'funding', aporte());
    actualizarOp(U, 'fun-1', { fallida: true });
    expect(resumenCola(U)).toEqual({ total: 2, fallidas: 1 });
  });

  it('la fila fantasma de una operación fallida lo indica', () => {
    encolar(U, 'income', ingreso);
    actualizarOp(U, 'inc-1', { fallida: true });
    expect(mezclarConPendientes(U, 'income', [])[0].sync_failed).toBe(true);
  });

  it('detecta aportes pendientes de un ingreso', () => {
    encolar(U, 'funding', aporte());
    expect(hayAportesPendientesDeIngreso(U, 'inc-1')).toBe(true);
    expect(hayAportesPendientesDeIngreso(U, 'inc-2')).toBe(false);
  });

  it('cambiar el nombre de un grupo alcanza a los aportes en cola', () => {
    encolar(U, 'funding', aporte({ etiqueta: 'iPhone 12' }));
    renombrarEtiquetaEnCola(U, 'cat-A', 'iPhone 12', 'iPhone 12 Pro');
    expect(leerCola(U)[0].payload.etiqueta).toBe('iPhone 12 Pro');
  });

  it('si el celular no deja guardar, avisa en vez de aparentar que quedó anotado', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota');
    });
    expect(() => encolar(U, 'income', ingreso)).toThrow(/no se pudo guardar/i);
    spy.mockRestore();
  });

  it('rechaza un tipo desconocido', () => {
    expect(() => encolar(U, 'otra', ingreso)).toThrow();
  });
});

describe('esErrorDeRed', () => {
  it('reconoce los mensajes típicos de Chrome y Safari/iPhone', () => {
    expect(esErrorDeRed({ message: 'TypeError: Failed to fetch' })).toBe(true);
    expect(esErrorDeRed({ message: 'Load failed' })).toBe(true);
    expect(esErrorDeRed({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true);
  });
  it('un rechazo del servidor NO es error de red', () => {
    expect(esErrorDeRed({ message: 'violates foreign key constraint', code: '23503' })).toBe(false);
    expect(esErrorDeRed(null)).toBe(false);
  });
  it('sin conexión cualquier error cuenta como de red', () => {
    simularRed(false);
    expect(esErrorDeRed({ message: 'otra cosa' })).toBe(true);
  });
});

describe('insertarOEncolar', () => {
  it('con conexión inserta directo y no deja nada en la cola', async () => {
    const insertar = vi.fn().mockResolvedValue({ data: [{ id: 'inc-1' }], error: null });
    const res = await insertarOEncolar({ userId: U, kind: 'income', filas: [ingreso], insertar });
    expect(res).toEqual({ filas: [{ id: 'inc-1' }], pendiente: false });
    expect(leerCola(U)).toEqual([]);
  });

  it('sin conexión ni intenta el servidor: encola', async () => {
    simularRed(false);
    const insertar = vi.fn();
    const res = await insertarOEncolar({ userId: U, kind: 'income', filas: [ingreso], insertar });
    expect(insertar).not.toHaveBeenCalled();
    expect(res.pendiente).toBe(true);
    expect(leerCola(U)).toHaveLength(1);
  });

  it('señal mala (navigator dice online pero el fetch falla): encola igual', async () => {
    const insertar = vi.fn().mockResolvedValue({ data: null, error: { message: 'Load failed' } });
    const res = await insertarOEncolar({ userId: U, kind: 'income', filas: [ingreso], insertar });
    expect(res.pendiente).toBe(true);
    expect(leerCola(U)).toHaveLength(1);
  });

  it('si el fetch lanza una excepción, también encola', async () => {
    const insertar = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await insertarOEncolar({ userId: U, kind: 'income', filas: [ingreso], insertar });
    expect(res.pendiente).toBe(true);
  });

  it('si el servidor rechaza (dato inválido) NO se encola: devuelve el error', async () => {
    const error = { message: 'check constraint', code: '23514' };
    const insertar = vi.fn().mockResolvedValue({ data: null, error });
    const res = await insertarOEncolar({ userId: U, kind: 'income', filas: [ingreso], insertar });
    expect(res).toEqual({ error });
    expect(leerCola(U)).toEqual([]);
  });

  it('forzarCola encola aunque haya conexión (reparto de un ingreso aún pendiente)', async () => {
    const insertar = vi.fn();
    const res = await insertarOEncolar({ userId: U, kind: 'funding', filas: [aporte(), aporte({ id: 'fun-2' })], insertar, forzarCola: true });
    expect(insertar).not.toHaveBeenCalled();
    expect(res.filas).toHaveLength(2);
    expect(leerCola(U).map((o) => o.payload.id)).toEqual(['fun-1', 'fun-2']);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const estado = { userId: 'u1', fila: null, errorUpsert: null, errorDelete: null, upserts: [] };

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: estado.userId ? { user: { id: estado.userId } } : null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: estado.fila }) }) }) }),
      upsert: async (f) => {
        estado.upserts.push(f);
        return { error: estado.errorUpsert };
      },
      delete: () => ({ eq: async () => ({ error: estado.errorDelete }) }),
    }),
  },
}));

const confirmarMock = vi.fn();
vi.mock('./dialogs', () => ({ confirmar: (...a) => confirmarMock(...a) }));

import {
  asegurarConsentimientoIA,
  consentimientoGuardado,
  retirarConsentimientosIA,
  limpiarDatosLocales,
  VERSION_CONSENTIMIENTO,
} from './privacidad';

beforeEach(() => {
  localStorage.clear();
  confirmarMock.mockReset();
  Object.assign(estado, { userId: 'u1', fila: null, errorUpsert: null, errorDelete: null, upserts: [] });
});

describe('consentimiento de IA', () => {
  it('sin sesion lanza error', async () => {
    estado.userId = null;
    await expect(asegurarConsentimientoIA('ia_boletas')).rejects.toThrow('iniciar sesión');
  });

  it('si ya esta guardado en el dispositivo no pregunta', async () => {
    localStorage.setItem('consentimiento-ia:ia_boletas:u1', VERSION_CONSENTIMIENTO);
    await asegurarConsentimientoIA('ia_boletas');
    expect(confirmarMock).not.toHaveBeenCalled();
  });

  it('si esta en la base con la version vigente lo guarda local y no pregunta', async () => {
    estado.fila = { version: VERSION_CONSENTIMIENTO };
    await asegurarConsentimientoIA('ia_boletas');
    expect(confirmarMock).not.toHaveBeenCalled();
    expect(consentimientoGuardado('u1', 'ia_boletas')).toBe(true);
  });

  it('si no hay permiso, lo pide y al aceptar lo guarda', async () => {
    confirmarMock.mockResolvedValue(true);
    await asegurarConsentimientoIA('ia_asistente');
    expect(confirmarMock).toHaveBeenCalledOnce();
    expect(estado.upserts[0]).toMatchObject({ user_id: 'u1', tipo: 'ia_asistente', version: VERSION_CONSENTIMIENTO });
    expect(consentimientoGuardado('u1', 'ia_asistente')).toBe(true);
  });

  it('si el usuario no acepta, lanza error y no guarda nada', async () => {
    confirmarMock.mockResolvedValue(false);
    await expect(asegurarConsentimientoIA('ia_boletas')).rejects.toThrow('Sin tu permiso');
    expect(estado.upserts).toHaveLength(0);
  });

  it('si no se puede guardar el permiso en la base, avisa', async () => {
    confirmarMock.mockResolvedValue(true);
    estado.errorUpsert = { message: 'x' };
    await expect(asegurarConsentimientoIA('ia_boletas')).rejects.toThrow('No se pudo guardar');
  });

  it('el permiso de un usuario no vale para otro', async () => {
    localStorage.setItem('consentimiento-ia:ia_boletas:u1', VERSION_CONSENTIMIENTO);
    expect(consentimientoGuardado('u2', 'ia_boletas')).toBe(false);
  });

  it('si el almacenamiento falla, consentimientoGuardado devuelve false', () => {
    const espia = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(consentimientoGuardado('u1', 'ia_boletas')).toBe(false);
    espia.mockRestore();
  });
});

describe('retirar permisos y limpiar datos locales', () => {
  it('retirar borra los permisos locales', async () => {
    localStorage.setItem('consentimiento-ia:ia_boletas:u1', '1');
    localStorage.setItem('consentimiento-ia:ia_asistente:u1', '1');
    await retirarConsentimientosIA('u1');
    expect(localStorage.length).toBe(0);
  });

  it('retirar lanza error si la base falla', async () => {
    estado.errorDelete = { message: 'x' };
    await expect(retirarConsentimientosIA('u1')).rejects.toThrow('No se pudo retirar');
  });

  it('limpiarDatosLocales borra solo lo del usuario', () => {
    localStorage.setItem('cola:u1', 'a');
    localStorage.setItem('pin:u1', 'b');
    localStorage.setItem('cola:u2', 'c');
    limpiarDatosLocales('u1');
    expect(localStorage.getItem('cola:u1')).toBeNull();
    expect(localStorage.getItem('pin:u1')).toBeNull();
    expect(localStorage.getItem('cola:u2')).toBe('c');
  });
});

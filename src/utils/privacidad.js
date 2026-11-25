import { supabase } from '../lib/supabaseClient';
import { confirmar } from './dialogs';

export const VERSION_CONSENTIMIENTO = '1';

export const TEXTOS_CONSENTIMIENTO = {
  ia_boletas: {
    titulo: 'Leer boletas con IA',
    mensaje:
      'Para leer tu boleta, la foto se envía a Gemini, un servicio de inteligencia artificial de Google, que está fuera de Chile. ' +
      'Solo se usa para sacar el monto, la fecha y el comercio. La foto no la guardamos para entrenar nada. ' +
      'Puedes retirar este permiso cuando quieras desde Ajustes, Privacidad. ¿Aceptas?',
  },
  ia_asistente: {
    titulo: 'Usar el asistente con IA',
    mensaje:
      'Para responderte, el asistente envía un resumen de tus gastos, deudas y metas a Gemini, un servicio de inteligencia artificial de Google, que está fuera de Chile. ' +
      'Puedes retirar este permiso cuando quieras desde Ajustes, Privacidad. ¿Aceptas?',
  },
};

const clave = (userId, tipo) => `consentimiento-ia:${tipo}:${userId}`;

export function consentimientoGuardado(userId, tipo) {
  try {
    return localStorage.getItem(clave(userId, tipo)) === VERSION_CONSENTIMIENTO;
  } catch {
    return false;
  }
}

function guardarLocal(userId, tipo) {
  try {
    localStorage.setItem(clave(userId, tipo), VERSION_CONSENTIMIENTO);
  } catch {
    // sin almacenamiento local: se vuelve a consultar la base la próxima vez
  }
}

// Antes de mandar datos a la IA: si no hay permiso guardado, lo pide.
// Lanza un error con mensaje para mostrar si el usuario no acepta.
export async function asegurarConsentimientoIA(tipo) {
  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion?.session?.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión.');
  if (consentimientoGuardado(userId, tipo)) return;

  const { data: fila } = await supabase
    .from('user_consents')
    .select('version')
    .eq('user_id', userId)
    .eq('tipo', tipo)
    .maybeSingle();
  if (fila?.version === VERSION_CONSENTIMIENTO) {
    guardarLocal(userId, tipo);
    return;
  }

  const { titulo, mensaje } = TEXTOS_CONSENTIMIENTO[tipo];
  const acepta = await confirmar(mensaje, { titulo, textoConfirmar: 'Acepto' });
  if (!acepta) throw new Error('Sin tu permiso no se puede usar la IA. Puedes ingresar los datos a mano.');

  const { error } = await supabase
    .from('user_consents')
    .upsert({ user_id: userId, tipo, version: VERSION_CONSENTIMIENTO, aceptado_en: new Date().toISOString() });
  if (error) throw new Error('No se pudo guardar tu permiso. Revisa tu conexión e intenta de nuevo.');
  guardarLocal(userId, tipo);
}

export async function retirarConsentimientosIA(userId) {
  const { error } = await supabase.from('user_consents').delete().eq('user_id', userId);
  if (error) throw new Error('No se pudo retirar el permiso. Intenta de nuevo.');
  for (const tipo of Object.keys(TEXTOS_CONSENTIMIENTO)) {
    try {
      localStorage.removeItem(clave(userId, tipo));
    } catch {
      // nada que borrar
    }
  }
}

// Borra del dispositivo todo lo guardado para este usuario.
export function limpiarDatosLocales(userId) {
  try {
    const claves = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.includes(userId)) claves.push(k);
    }
    claves.forEach((k) => localStorage.removeItem(k));
  } catch {
    // nada que borrar
  }
}

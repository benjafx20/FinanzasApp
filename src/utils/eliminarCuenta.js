import { supabase } from '../lib/supabaseClient';
import { pedirTexto, alertar } from './dialogs';
import { limpiarDatosLocales } from './privacidad';

export const PALABRA_CONFIRMAR = 'ELIMINAR';

// Pide confirmación escrita, borra la cuenta en el servidor y cierra la sesión.
// Devuelve true si la cuenta se eliminó.
export async function eliminarCuenta(userId) {
  const texto = await pedirTexto({
    titulo: 'Eliminar mi cuenta',
    mensaje: `Se borran para siempre tu cuenta, tus datos y las fotos de tus boletas. No se puede deshacer. Escribe ${PALABRA_CONFIRMAR} para confirmar.`,
    textoConfirmar: 'Eliminar',
    maxLength: 20,
  });
  if (texto === null || texto === undefined) return false;
  if (texto.trim() !== PALABRA_CONFIRMAR) {
    await alertar(`Escribiste otra cosa. Para eliminar la cuenta hay que escribir ${PALABRA_CONFIRMAR}.`, 'No se eliminó');
    return false;
  }

  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmar: PALABRA_CONFIRMAR } });
  if (error || !data?.ok) {
    throw new Error(data?.error || 'No se pudo eliminar la cuenta. Intenta de nuevo.');
  }

  limpiarDatosLocales(userId);
  await supabase.auth.signOut();
  return true;
}

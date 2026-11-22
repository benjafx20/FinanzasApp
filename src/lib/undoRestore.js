import { supabase } from './supabaseClient';

// Para deshacer un borrado se vuelven a insertar las filas tal como estaban (con el
// mismo id, así todo lo que las referenciaba sigue funcionando). Las filas que están
// en pantalla traen campos extra (la categoría unida, "pending"...) que no son
// columnas de la tabla: se descartan.
const esColumna = ([clave, valor]) => clave !== 'pending' && (valor === null || typeof valor !== 'object');

export function filaParaRestaurar(fila) {
  return Object.fromEntries(Object.entries(fila).filter(esColumna));
}

export async function restaurarFilas(tabla, filas) {
  if (!filas.length) return;
  const { error } = await supabase.from(tabla).insert(filas.map(filaParaRestaurar));
  if (error) {
    console.error('[undoRestore]', tabla, error);
    throw new Error('No se pudo deshacer. Intenta de nuevo.');
  }
}

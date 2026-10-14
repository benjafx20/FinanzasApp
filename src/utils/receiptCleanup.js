import { supabase } from '../lib/supabaseClient';
import { fechaLocalISO } from './dates';

// Borra las fotos de boletas que ya no tienen un gasto asociado (por ejemplo,
// si la app se cerró justo entre subir la foto y guardar el gasto). Corre a lo
// más una vez al día y solo toca fotos de más de 24 horas, para no pisar una
// subida en curso. Si algo falla, no borra nada.
const CLAVE = 'boletas-limpieza-fecha';
const GRACIA_MS = 24 * 60 * 60 * 1000;
const PAGINA = 1000;

async function rutasReferenciadas() {
  const rutas = new Set();
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('expenses')
      .select('receipt_path')
      .not('receipt_path', 'is', null)
      .order('id')
      .range(desde, desde + PAGINA - 1);
    if (error) return null;
    for (const fila of data) rutas.add(fila.receipt_path);
    if (data.length < PAGINA) return rutas;
  }
}

export async function limpiarBoletasHuerfanas(userId) {
  try {
    const hoy = fechaLocalISO();
    if (localStorage.getItem(CLAVE) === hoy) return;

    const referenciadas = await rutasReferenciadas();
    if (!referenciadas) return;

    const huerfanas = [];
    for (let offset = 0; ; offset += PAGINA) {
      const { data, error } = await supabase.storage.from('receipts').list(userId, { limit: PAGINA, offset });
      if (error) return;
      for (const archivo of data) {
        if (archivo.name.startsWith('.') || !archivo.created_at) continue;
        const ruta = `${userId}/${archivo.name}`;
        const antiguo = Date.now() - new Date(archivo.created_at).getTime() > GRACIA_MS;
        if (antiguo && !referenciadas.has(ruta)) huerfanas.push(ruta);
      }
      if (data.length < PAGINA) break;
    }

    for (let i = 0; i < huerfanas.length; i += 100) {
      const { error } = await supabase.storage.from('receipts').remove(huerfanas.slice(i, i + 100));
      if (error) return;
    }
    localStorage.setItem(CLAVE, hoy);
  } catch {
    // se reintenta la próxima vez que se abra la app
  }
}

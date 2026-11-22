import { TABLAS, MAX_REINTENTOS, leerCola, quitarOp, actualizarOp, esErrorDeRed } from './offlineOps';

const DUPLICADO = '23505'; // ya existe una fila con ese id: la subida anterior sí llegó

// Sesión vencida: es transitorio (se renueva al volver a la app), no culpa de la operación.
function esErrorDeSesion(error) {
  if (error?.status === 401) return true;
  const msg = (error?.message || '').toLowerCase();
  return msg.includes('jwt') || msg.includes('token is expired');
}

// Sube la cola en orden (un ingreso antes de su reparto). Devuelve
// { subidas, fallidas, pendientes, sinRed }.
//   - Error de red o de sesión vencida: se detiene y deja todo para después (sin gastar reintentos).
//   - Rechazo del servidor: cuenta un reintento; al llegar al tope, la operación
//     queda marcada como fallida y deja de reintentarse hasta que el usuario decida.
//   - Un aporte cuyo ingreso no se pudo subir, se salta (no puede existir sin él).
export async function syncPendingOps(userId, supabase, conReintentoDeSesion = (fn) => fn()) {
  const resultado = { subidas: 0, fallidas: 0, pendientes: 0, sinRed: false };
  if (!userId) return resultado;

  const noSubidos = new Set();

  for (const op of leerCola(userId)) {
    const id = op.payload.id;
    if (op.fallida || noSubidos.has(op.payload.income_id)) {
      noSubidos.add(id);
      continue;
    }

    let error = null;
    try {
      ({ error } = await conReintentoDeSesion(() => supabase.from(TABLAS[op.kind]).insert(op.payload)));
    } catch (err) {
      error = err;
    }

    if (!error || error.code === DUPLICADO) {
      quitarOp(userId, id);
      resultado.subidas++;
      continue;
    }

    if (esErrorDeRed(error) || esErrorDeSesion(error)) {
      resultado.sinRed = true;
      break;
    }

    console.error('[syncPendingOps] rechazada por el servidor:', op.kind, error);
    const intentos = (op.intentos || 0) + 1;
    const fallida = intentos >= MAX_REINTENTOS;
    actualizarOp(userId, id, { intentos, fallida });
    noSubidos.add(id);
  }

  const cola = leerCola(userId);
  resultado.pendientes = cola.length;
  resultado.fallidas = cola.filter((op) => op.fallida).length;
  return resultado;
}

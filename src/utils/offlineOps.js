// Cola de operaciones hechas sin conexión: ingresos, aportes a categorías y aportes
// a metas de ahorro (los gastos tienen su propia cola, en offlineQueue.js).
//
// Cada operación se guarda en localStorage con su `id` definitivo (un UUID creado
// en el celular). Así, si una subida se repite (se cortó la señal justo al
// responder), el servidor dice "ya existe" y no se duplica nada.
//
// Mientras esperan, las operaciones se muestran en las listas como filas
// "fantasma" (marcadas pending: true) y cuentan en los saldos.
export const TABLAS = {
  income: 'incomes',
  funding: 'category_fundings',
  contribution: 'savings_contributions',
};
export const MAX_REINTENTOS = 5;
export const EVENTO_COLA = 'finanzas-pending-changed';

const keyCola = (userId) => `finanzas_pending_ops_${userId}`;

export function nuevoId() {
  return globalThis.crypto.randomUUID();
}

export function leerCola(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(keyCola(userId));
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarCola(userId, lista) {
  try {
    localStorage.setItem(keyCola(userId), JSON.stringify(lista));
  } catch {
    return false;
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_COLA));
  return true;
}

// Agrega una operación. Devuelve la fila fantasma, o lanza error si el celular no
// deja guardar (así el usuario se entera en vez de creer que quedó anotado).
export function encolar(userId, kind, fila) {
  if (!TABLAS[kind]) throw new Error(`Tipo de operación desconocido: ${kind}`);
  const op = {
    kind,
    payload: { ...fila, id: fila.id || nuevoId() },
    created_at: new Date().toISOString(),
    intentos: 0,
    fallida: false,
  };
  if (!guardarCola(userId, [...leerCola(userId), op])) {
    throw new Error('No hay conexión y no se pudo guardar en el celular. Intenta de nuevo con señal.');
  }
  return filaFantasma(op);
}

export function filaFantasma(op) {
  return { ...op.payload, created_at: op.created_at, pending: true, ...(op.fallida ? { sync_failed: true } : {}) };
}

// Filas fantasma de un tipo, para mezclarlas con lo que viene del servidor.
export function filasPendientes(userId, kind) {
  return leerCola(userId)
    .filter((op) => op.kind === kind)
    .map(filaFantasma);
}

// Une lo del servidor con lo pendiente: lo pendiente va arriba y, si el servidor ya
// lo tiene (se subió pero la cola no alcanzó a limpiarse), no se repite.
export function mezclarConPendientes(userId, kind, filasServidor) {
  const ids = new Set(filasServidor.map((f) => f.id));
  return [...filasPendientes(userId, kind).filter((f) => !ids.has(f.id)), ...filasServidor];
}

export function estaPendiente(userId, id) {
  return leerCola(userId).some((op) => op.payload.id === id);
}

// ¿Algún aporte pendiente cuelga de este ingreso?
export function hayAportesPendientesDeIngreso(userId, incomeId) {
  return leerCola(userId).some((op) => op.kind === 'funding' && op.payload.income_id === incomeId);
}

export function quitarOp(userId, id) {
  guardarCola(userId, leerCola(userId).filter((op) => op.payload.id !== id));
}

export function actualizarOp(userId, id, cambios) {
  guardarCola(
    userId,
    leerCola(userId).map((op) => (op.payload.id === id ? { ...op, ...cambios } : op))
  );
}

// Descarta lo que no se pudo subir (el usuario decide). Devuelve cuántas quitó.
export function descartarFallidas(userId) {
  const lista = leerCola(userId);
  const fallidas = lista.filter((op) => op.fallida);
  if (fallidas.length === 0) return 0;
  // Si se descarta un ingreso, también se descartan los aportes que colgaban de él.
  const idsDescartados = new Set(fallidas.map((op) => op.payload.id));
  const quedan = lista.filter((op) => !op.fallida && !idsDescartados.has(op.payload.income_id));
  guardarCola(userId, quedan);
  return lista.length - quedan.length;
}

export function resumenCola(userId) {
  const lista = leerCola(userId);
  return { total: lista.length, fallidas: lista.filter((op) => op.fallida).length };
}

// ¿Este error es "no hay red" (se puede reintentar luego) y no "el servidor dijo que no"?
export function esErrorDeRed(error) {
  if (!error) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = `${error.message || ''} ${error.name || ''}`.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout')
  );
}

export const MENSAJE_PENDIENTE =
  'Esto todavía no se sube (se hizo sin conexión). Cuando se sincronice podrás editarlo o borrarlo.';

// Inserta en el servidor y, si no hay red (o se pide), deja las filas en la cola.
//   filas: [{ id, ... }]; insertar: () => Promise<{ data, error }> (ya con select()).
// Devuelve { filas, pendiente } o { error } si el servidor las rechazó.
export async function insertarOEncolar({ userId, kind, filas, insertar, forzarCola = false }) {
  const encolarTodas = () => filas.map((f) => encolar(userId, kind, f));
  if (forzarCola || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return { filas: encolarTodas(), pendiente: true };
  }
  let respuesta;
  try {
    respuesta = await insertar();
  } catch (err) {
    respuesta = { data: null, error: err };
  }
  if (!respuesta.error) return { filas: respuesta.data, pendiente: false };
  if (esErrorDeRed(respuesta.error)) return { filas: encolarTodas(), pendiente: true };
  return { error: respuesta.error };
}

// Cambiar el nombre de un grupo también debe alcanzar a los aportes que aún esperan subir.
export function renombrarEtiquetaEnCola(userId, categoryId, de, a) {
  const lista = leerCola(userId);
  if (!lista.some((op) => op.kind === 'funding' && op.payload.category_id === categoryId && op.payload.etiqueta === de)) return;
  guardarCola(
    userId,
    lista.map((op) =>
      op.kind === 'funding' && op.payload.category_id === categoryId && op.payload.etiqueta === de
        ? { ...op, payload: { ...op.payload, etiqueta: a } }
        : op
    )
  );
}

export function hayContribucionesPendientesDeMeta(userId, goalId) {
  return leerCola(userId).some((op) => op.kind === 'contribution' && op.payload.goal_id === goalId);
}

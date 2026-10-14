// Fotos de boletas de gastos guardados SIN conexión. La foto no cabe en
// localStorage (donde vive la cola de gastos), así que se guarda en IndexedDB
// con la misma clave del gasto pendiente. Al volver la señal, el gasto se
// sube y después su foto (ver useExpenses).
const DB_NAME = 'finanzas-outbox';
const STORE = 'boletas';

function abrir() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function operar(modo, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modo);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req?.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

// key = id del gasto pendiente. expenseId queda null hasta que el gasto se sube.
export const guardarBoleta = (key, blob) => operar('readwrite', (s) => s.put({ key, blob, expenseId: null }));
export const obtenerBoleta = (key) => operar('readonly', (s) => s.get(key));
export const borrarBoleta = (key) => operar('readwrite', (s) => s.delete(key));

export async function vincularBoleta(key, expenseId) {
  const entrada = await obtenerBoleta(key);
  if (entrada) await operar('readwrite', (s) => s.put({ ...entrada, expenseId }));
}

// Fotos cuyo gasto ya se subió pero la foto todavía no.
export async function boletasVinculadas() {
  const todas = await operar('readonly', (s) => s.getAll());
  return (todas || []).filter((e) => e.expenseId);
}

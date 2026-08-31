// Cola simple en localStorage para gastos que el usuario registra sin
// conexión (ej: en el supermercado, sin señal). Se guardan acá temporalmente,
// se muestran igual en la lista marcados como "sin sincronizar", y se
// suben solos a Supabase apenas vuelve la conexión.
const KEY_PREFIX = 'finanzas_pending_expenses_';

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

export function getPendingExpenses(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingExpenses(userId, list) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    // Si localStorage no está disponible (modo privado, cuota llena),
    // el gasto no queda encolado; el insert normal más arriba es el
    // que finalmente le avisa al usuario que no se pudo guardar.
  }
}

export function queuePendingExpense(userId, payload) {
  const pendiente = {
    ...payload,
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    pending: true,
  };
  savePendingExpenses(userId, [...getPendingExpenses(userId), pendiente]);
  return pendiente;
}

export function removePendingExpense(userId, pendingId) {
  savePendingExpenses(userId, getPendingExpenses(userId).filter((e) => e.id !== pendingId));
}

export function updatePendingExpense(userId, pendingId, changes) {
  const list = getPendingExpenses(userId).map((e) => (e.id === pendingId ? { ...e, ...changes } : e));
  savePendingExpenses(userId, list);
  return list.find((e) => e.id === pendingId);
}

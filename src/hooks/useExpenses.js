import { useState, useEffect, useCallback } from 'react';
import { supabase, withSessionRetry } from '../lib/supabaseClient';
import { getPendingExpenses, queuePendingExpense, removePendingExpense, updatePendingExpense } from '../utils/offlineQueue';

const SELECT_EXPENSE =
  '*, categories!expenses_category_id_fkey(id, nombre, icono, color), funding:funding_category_id(id, nombre, icono, color)';

function isPendingId(id) {
  return typeof id === 'string' && id.startsWith('pending-');
}

export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await withSessionRetry(() =>
      supabase.from('expenses').select(SELECT_EXPENSE).order('fecha', { ascending: false })
    );

    if (fetchError) {
      console.error('[useExpenses] fetchExpenses:', fetchError);
      setError(`No se pudieron cargar los gastos: ${fetchError.message}`);
      setLoading(false);
      return;
    }
    // Los gastos registrados sin conexión que todavía no se han podido
    // subir se muestran igual, arriba de todo, marcados como pendientes.
    const pendientes = getPendingExpenses(userId);
    setExpenses([...pendientes, ...data]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Intenta subir los gastos guardados localmente mientras no había
  // conexión. Se llama al volver la señal (ver useRefetchOnFocus en
  // Dashboard) y al montar, por si quedaron pendientes de una sesión
  // anterior. Si sigue sin haber conexión, no hace nada (no truena).
  const syncPendingExpenses = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    const pendientes = getPendingExpenses(userId);
    if (pendientes.length === 0) return;

    for (const pendiente of pendientes) {
      const { pending: _pending, id: _id, created_at: _createdAt, ...payload } = pendiente;
      const { error: insertError } = await supabase.from('expenses').insert(payload);
      // Si falla uno (ej: se cortó la conexión de nuevo a mitad de camino),
      // se deja en la cola y se reintenta la próxima vez.
      if (!insertError) removePendingExpense(userId, pendiente.id);
    }
    fetchExpenses();
  }, [userId, fetchExpenses]);

  useEffect(() => {
    syncPendingExpenses();
  }, [syncPendingExpenses]);

  // `fundingCategoryId` (opcional): si el gasto se pagó con el saldo de OTRA
  // categoría distinta a `categoryId` (ej: gasto categorizado en Celulares
  // pero pagado con la plata de Beca). Si no se pasa, se paga con el saldo
  // de su propia categoría (el caso normal).
  const addExpense = useCallback(async ({ categoryId, monto, fecha, nota, fundingCategoryId }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!categoryId) throw new Error('Debes seleccionar una categoría.');

    const payload = {
      user_id: userId,
      category_id: categoryId,
      monto,
      fecha,
      nota,
      funding_category_id: fundingCategoryId || null,
    };

    // Sin conexión: se guarda localmente y se muestra al tiro, marcado
    // como "sin sincronizar". Se sube solo apenas vuelve la señal.
    if (!navigator.onLine) {
      const pendiente = queuePendingExpense(userId, payload);
      setExpenses((prev) => [pendiente, ...prev]);
      return pendiente;
    }

    const { data, error: insertError } = await withSessionRetry(() =>
      supabase.from('expenses').insert(payload).select(SELECT_EXPENSE).single()
    );

    if (insertError) {
      console.error('[useExpenses] addExpense:', insertError);
      throw new Error(`No se pudo registrar el gasto: ${insertError.message}`);
    }
    setExpenses((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const updateExpense = useCallback(async (expenseId, { categoryId, monto, fecha, nota, fundingCategoryId }) => {
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!categoryId) throw new Error('Debes seleccionar una categoría.');

    // Un gasto que todavía no se sincroniza vive solo en el navegador:
    // se edita ahí mismo, no en Supabase.
    if (isPendingId(expenseId)) {
      const cambios = { category_id: categoryId, monto, fecha, nota, funding_category_id: fundingCategoryId || null };
      const actualizado = updatePendingExpense(userId, expenseId, cambios);
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? actualizado : e)));
      return actualizado;
    }

    const { data, error: updateError } = await supabase
      .from('expenses')
      .update({
        category_id: categoryId,
        monto,
        fecha,
        nota,
        funding_category_id: fundingCategoryId || null,
      })
      .eq('id', expenseId)
      .select(SELECT_EXPENSE)
      .single();

    if (updateError) throw new Error('No se pudo actualizar el gasto. Intenta de nuevo.');
    setExpenses((prev) => prev.map((e) => (e.id === expenseId ? data : e)));
    return data;
  }, [userId]);

  const deleteExpense = useCallback(async (expenseId) => {
    if (isPendingId(expenseId)) {
      removePendingExpense(userId, expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      return;
    }

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteError) throw new Error('No se pudo eliminar el gasto.');
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }, [userId]);

  return { expenses, loading, error, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses, syncPendingExpenses };
}

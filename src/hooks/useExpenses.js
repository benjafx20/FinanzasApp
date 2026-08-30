import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('expenses')
      .select('*, categories(id, nombre, icono, color), funding:funding_category_id(id, nombre, icono, color)')
      .order('fecha', { ascending: false });

    if (fetchError) {
      setError('No se pudieron cargar los gastos. Intenta recargar la página.');
      setLoading(false);
      return;
    }
    setExpenses(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // `fundingCategoryId` (opcional): si el gasto se pagó con el saldo de OTRA
  // categoría distinta a `categoryId` (ej: gasto categorizado en Celulares
  // pero pagado con la plata de Beca). Si no se pasa, se paga con el saldo
  // de su propia categoría (el caso normal).
  const addExpense = useCallback(async ({ categoryId, monto, fecha, nota, fundingCategoryId }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!categoryId) throw new Error('Debes seleccionar una categoría.');

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        category_id: categoryId,
        monto,
        fecha,
        nota,
        funding_category_id: fundingCategoryId || null,
      })
      .select('*, categories(id, nombre, icono, color), funding:funding_category_id(id, nombre, icono, color)')
      .single();

    if (insertError) throw new Error('No se pudo registrar el gasto. Intenta de nuevo.');
    setExpenses((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const updateExpense = useCallback(async (expenseId, { categoryId, monto, fecha, nota, fundingCategoryId }) => {
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!categoryId) throw new Error('Debes seleccionar una categoría.');

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
      .select('*, categories(id, nombre, icono, color), funding:funding_category_id(id, nombre, icono, color)')
      .single();

    if (updateError) throw new Error('No se pudo actualizar el gasto. Intenta de nuevo.');
    setExpenses((prev) => prev.map((e) => (e.id === expenseId ? data : e)));
    return data;
  }, []);

  const deleteExpense = useCallback(async (expenseId) => {
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteError) throw new Error('No se pudo eliminar el gasto.');
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }, []);

  return { expenses, loading, error, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
}

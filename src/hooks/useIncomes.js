import { useState, useEffect, useCallback } from 'react';
import { supabase, withSessionRetry } from '../lib/supabaseClient';

export function useIncomes(userId) {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncomes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await withSessionRetry(() =>
      supabase.from('incomes').select('*').order('fecha', { ascending: false })
    );

    if (fetchError) {
      console.error('[useIncomes] fetchIncomes:', fetchError);
      setError(`No se pudieron cargar los ingresos: ${fetchError.message}`);
      setLoading(false);
      return;
    }
    setIncomes(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const addIncome = useCallback(async ({ monto, fecha, nota }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    const { data, error: insertError } = await withSessionRetry(() =>
      supabase.from('incomes').insert({ user_id: userId, monto, fecha, nota }).select().single()
    );

    if (insertError) {
      console.error('[useIncomes] addIncome:', insertError);
      throw new Error(`No se pudo registrar el ingreso: ${insertError.message}`);
    }
    setIncomes((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const updateIncome = useCallback(async (incomeId, { monto, fecha, nota }) => {
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    const { data, error: updateError } = await supabase
      .from('incomes')
      .update({ monto, fecha, nota })
      .eq('id', incomeId)
      .select()
      .single();

    if (updateError) throw new Error('No se pudo actualizar el ingreso.');
    setIncomes((prev) => prev.map((i) => (i.id === incomeId ? data : i)));
    return data;
  }, []);

  const deleteIncome = useCallback(async (incomeId) => {
    const { error: deleteError } = await supabase.from('incomes').delete().eq('id', incomeId);
    if (deleteError) throw new Error('No se pudo eliminar el ingreso.');
    setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
  }, []);

  return { incomes, loading, error, addIncome, updateIncome, deleteIncome, refetch: fetchIncomes };
}

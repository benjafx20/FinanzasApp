import { useState, useEffect, useCallback } from 'react';
import { supabase, withSessionRetry } from '../lib/supabaseClient';

export function useCategoryFundings(userId) {
  const [fundings, setFundings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFundings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await withSessionRetry(() =>
      supabase.from('category_fundings').select('*').order('created_at', { ascending: false })
    );

    if (fetchError) {
      console.error('[useCategoryFundings] fetchFundings:', fetchError);
      setError(`No se pudieron cargar los aportes a categorías: ${fetchError.message}`);
      setLoading(false);
      return;
    }
    setFundings(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchFundings();
  }, [fetchFundings]);

  // Aporte manual directo a una categoría (ej: vendiste algo y le sumas esa plata).
  const addManualFunding = useCallback(async ({ categoryId, monto, nota }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    const { data, error: insertError } = await withSessionRetry(() =>
      supabase
        .from('category_fundings')
        .insert({ user_id: userId, category_id: categoryId, monto, origen: 'manual', nota: nota?.trim() || null })
        .select()
        .single()
    );

    if (insertError) {
      console.error('[useCategoryFundings] addManualFunding:', insertError);
      throw new Error(`No se pudo agregar la plata a la categoría: ${insertError.message}`);
    }
    setFundings((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  // Reparte un ingreso ya registrado entre varias categorías de una vez.
  // `reparto` es un array de { categoryId, monto }.
  const addIncomeFundings = useCallback(async (incomeId, reparto) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    const filas = reparto
      .filter((r) => r.monto > 0)
      .map((r) => ({
        user_id: userId,
        category_id: r.categoryId,
        monto: r.monto,
        origen: 'ingreso',
        income_id: incomeId,
      }));
    if (filas.length === 0) return [];

    const { data, error: insertError } = await supabase.from('category_fundings').insert(filas).select();
    if (insertError) throw new Error('El ingreso se registró, pero no se pudo repartir entre categorías.');
    setFundings((prev) => [...data, ...prev]);
    return data;
  }, [userId]);

  const deleteFunding = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('category_fundings').delete().eq('id', id);
    if (deleteError) throw new Error('No se pudo eliminar el aporte.');
    setFundings((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const totalPorCategoria = useCallback(() => {
    const map = {};
    for (const f of fundings) {
      map[f.category_id] = (map[f.category_id] || 0) + Number(f.monto);
    }
    return map;
  }, [fundings]);

  return { fundings, loading, error, addManualFunding, addIncomeFundings, deleteFunding, totalPorCategoria, refetch: fetchFundings };
}

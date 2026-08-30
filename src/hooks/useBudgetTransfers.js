import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Las transferencias ya no están amarradas a un período: el saldo de una
// categoría es continuo, así que se traen todas (para calcular saldo real)
// y se muestran ordenadas por fecha de creación, más recientes primero.
export function useBudgetTransfers(userId) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('budget_transfers')
      .select(
        '*, origen:from_category_id(id, nombre, icono, color), destino:to_category_id(id, nombre, icono, color)'
      )
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('No se pudieron cargar los movimientos entre categorías.');
      setLoading(false);
      return;
    }
    setTransfers(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const addTransfer = useCallback(async ({ fromCategoryId, toCategoryId, monto, nota }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!fromCategoryId || !toCategoryId) throw new Error('Elige la categoría de origen y destino.');
    if (fromCategoryId === toCategoryId) throw new Error('El origen y el destino no pueden ser la misma categoría.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    const { data, error: insertError } = await supabase
      .from('budget_transfers')
      .insert({
        user_id: userId,
        from_category_id: fromCategoryId,
        to_category_id: toCategoryId,
        monto,
        nota: nota?.trim() || null,
      })
      .select(
        '*, origen:from_category_id(id, nombre, icono, color), destino:to_category_id(id, nombre, icono, color)'
      )
      .single();

    if (insertError) throw new Error('No se pudo registrar el movimiento.');
    setTransfers((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const deleteTransfer = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('budget_transfers').delete().eq('id', id);
    if (deleteError) throw new Error('No se pudo deshacer el movimiento.');
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Neto de transferencias por categoría: cuánto entró menos cuánto salió,
  // acumulado de todos los tiempos (no por período).
  const netoPorCategoria = useCallback(() => {
    const map = {};
    for (const t of transfers) {
      map[t.to_category_id] = (map[t.to_category_id] || 0) + Number(t.monto);
      map[t.from_category_id] = (map[t.from_category_id] || 0) - Number(t.monto);
    }
    return map;
  }, [transfers]);

  return { transfers, loading, error, addTransfer, deleteTransfer, netoPorCategoria, refetch: fetchTransfers };
}

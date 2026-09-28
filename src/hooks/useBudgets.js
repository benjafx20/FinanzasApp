import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentMonthKey, getCurrentWeekKey } from '../utils/dateHelpers';

// Trae TODAS las metas de gasto del usuario (mensuales y semanales, de
// cualquier categoría). Como ya no hay un selector de página, cada
// categoría puede mostrar su meta mensual y su semanal a la vez.
export function useBudgets(userId) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga muestra Cargando; al volver a la app se
  // refresca en silencio para que la lista no parpadee.
  const cargadoRef = useRef(false);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from('budgets').select('*');

    if (fetchError) {
      setError('No se pudieron cargar las metas de gasto.');
      setLoading(false);
      cargadoRef.current = true;
      return;
    }
    setBudgets(data);
    setLoading(false);
    cargadoRef.current = true;
  }, [userId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const upsertBudget = useCallback(async ({ categoryId, periodo, montoLimite }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!montoLimite || montoLimite <= 0) throw new Error('La meta debe ser mayor a 0.');

    const mes = periodo === 'mensual' ? getCurrentMonthKey() : getCurrentWeekKey();

    const { data, error: upsertError } = await supabase
      .from('budgets')
      .upsert(
        { user_id: userId, category_id: categoryId, monto_limite: montoLimite, periodo, mes },
        { onConflict: 'user_id,category_id,periodo,mes' }
      )
      .select()
      .single();

    if (upsertError) throw new Error('No se pudo guardar la meta.');
    setBudgets((prev) => {
      const exists = prev.find((b) => b.category_id === categoryId && b.periodo === periodo && b.mes === mes);
      return exists
        ? prev.map((b) => (b.category_id === categoryId && b.periodo === periodo && b.mes === mes ? data : b))
        : [...prev, data];
    });
    return data;
  }, [userId]);

  const removeBudget = useCallback(async ({ categoryId, periodo }) => {
    const mes = periodo === 'mensual' ? getCurrentMonthKey() : getCurrentWeekKey();

    const { error: deleteError } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('periodo', periodo)
      .eq('mes', mes);

    if (deleteError) throw new Error('No se pudo quitar la meta.');
    setBudgets((prev) => prev.filter((b) => !(b.category_id === categoryId && b.periodo === periodo && b.mes === mes)));
  }, [userId]);

  return { budgets, loading, error, upsertBudget, removeBudget, refetch: fetchBudgets };
}

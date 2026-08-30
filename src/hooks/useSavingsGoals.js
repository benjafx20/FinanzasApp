import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSavingsGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const [goalsRes, contribRes] = await Promise.all([
      supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
      supabase.from('savings_contributions').select('*'),
    ]);

    if (goalsRes.error || contribRes.error) {
      setError('No se pudieron cargar las metas de ahorro.');
      setLoading(false);
      return;
    }
    setGoals(goalsRes.data);
    setContributions(contribRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addGoal = useCallback(async ({ nombre, montoObjetivo, fechaObjetivo }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!nombre.trim()) throw new Error('Ponle un nombre a la meta.');
    if (!montoObjetivo || montoObjetivo <= 0) throw new Error('El monto objetivo debe ser mayor a 0.');

    const { data, error: insertError } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        nombre: nombre.trim(),
        monto_objetivo: montoObjetivo,
        fecha_objetivo: fechaObjetivo || null,
      })
      .select()
      .single();

    if (insertError) throw new Error('No se pudo crear la meta. Intenta de nuevo.');
    setGoals((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const deleteGoal = useCallback(async (goalId) => {
    const { error: deleteError } = await supabase.from('savings_goals').delete().eq('id', goalId);
    if (deleteError) throw new Error('No se pudo eliminar la meta.');
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setContributions((prev) => prev.filter((c) => c.goal_id !== goalId));
  }, []);

  const addContribution = useCallback(async (goalId, monto) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto del aporte debe ser mayor a 0.');

    const { data, error: insertError } = await supabase
      .from('savings_contributions')
      .insert({ goal_id: goalId, user_id: userId, monto })
      .select()
      .single();

    if (insertError) throw new Error('No se pudo registrar el aporte.');
    setContributions((prev) => [...prev, data]);
    return data;
  }, [userId]);

  const totalByGoal = useCallback(
    (goalId) => contributions.filter((c) => c.goal_id === goalId).reduce((sum, c) => sum + Number(c.monto), 0),
    [contributions]
  );

  return { goals, loading, error, addGoal, deleteGoal, addContribution, totalByGoal, refetch: fetchAll };
}

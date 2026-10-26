import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllPages } from '../lib/fetchAll';
import { hoyISO } from '../utils/dates';
import { supabase } from '../lib/supabaseClient';

export function useSavingsGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga muestra Cargando; al volver a la app se
  // refresca en silencio para que la lista no parpadee.
  const cargadoRef = useRef(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);

    const [goalsRes, contribRes] = await Promise.all([
      supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
      fetchAllPages(() =>
        supabase.from('savings_contributions').select('*').order('created_at', { ascending: false }).order('id')
      ),
    ]);

    if (goalsRes.error || contribRes.error) {
      setError('No se pudieron cargar las metas de ahorro.');
      setLoading(false);
      cargadoRef.current = true;
      return;
    }
    setGoals(goalsRes.data);
    setContributions(contribRes.data);
    setLoading(false);
    cargadoRef.current = true;
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

  // Edita nombre, monto objetivo y fecha de una meta. Si el nuevo objetivo es
  // menor a lo ahorrado, la meta simplemente queda completa.
  const updateGoal = useCallback(async (goalId, { nombre, montoObjetivo, fechaObjetivo, usedFor, usedAt }) => {
    if (!nombre.trim()) throw new Error('Ponle un nombre a la meta.');
    if (!montoObjetivo || Number(montoObjetivo) <= 0) throw new Error('El monto objetivo debe ser mayor a 0.');

    const { data, error: updateError } = await supabase
      .from('savings_goals')
      .update({
        nombre: nombre.trim(),
        monto_objetivo: montoObjetivo,
        fecha_objetivo: fechaObjetivo || null,
        // Solo en metas cerradas: en qué se gastó y cuándo.
        ...(usedFor !== undefined ? { used_for: usedFor?.trim() || null, used_at: usedAt || hoyISO() } : {}),
      })
      .eq('id', goalId)
      .select()
      .single();

    if (updateError) throw new Error('No se pudo editar la meta. Intenta de nuevo.');
    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)));
    return data;
  }, []);

  const deleteGoal = useCallback(async (goalId) => {
    const { error: deleteError } = await supabase.from('savings_goals').delete().eq('id', goalId);
    if (deleteError) throw new Error('No se pudo eliminar la meta.');
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setContributions((prev) => prev.filter((c) => c.goal_id !== goalId));
  }, []);

  // Cierra una meta (ya usaste la plata) o la reabre (completed = false). Cerrada,
  // sus aportes siguen descontados de las categorías: la plata se gastó.
  // Al cerrar se puede anotar en qué se gastó (usedFor) y cuándo (usedAt); solo es
  // una anotación, no mueve plata. Al reabrir se borra.
  const setGoalCompleted = useCallback(async (goalId, completed, { usedFor, usedAt } = {}) => {
    const cambios = completed
      ? { completed_at: new Date().toISOString(), used_for: usedFor?.trim() || null, used_at: usedAt || hoyISO() }
      : { completed_at: null, used_for: null, used_at: null };
    const { data, error: updateError } = await supabase
      .from('savings_goals')
      .update(cambios)
      .eq('id', goalId)
      .select()
      .single();
    if (updateError) throw new Error('No se pudo actualizar la meta.');
    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)));
    return data;
  }, []);

  // Corrige un aporte (monto y/o de dónde salió la plata).
  const updateContribution = useCallback(async (contributionId, { monto, sourceCategoryId }) => {
    if (!monto || Number(monto) <= 0) throw new Error('El monto debe ser mayor a 0.');
    const { data, error: updateError } = await supabase
      .from('savings_contributions')
      .update({ monto, source_category_id: sourceCategoryId || null })
      .eq('id', contributionId)
      .select()
      .single();
    if (updateError) throw new Error('No se pudo editar el aporte.');
    setContributions((prev) => prev.map((c) => (c.id === contributionId ? data : c)));
    return data;
  }, []);

  // Deshace un aporte: la plata vuelve a la categoría de donde salió.
  const deleteContribution = useCallback(async (contributionId) => {
    const { error: deleteError } = await supabase.from('savings_contributions').delete().eq('id', contributionId);
    if (deleteError) throw new Error('No se pudo deshacer el aporte.');
    setContributions((prev) => prev.filter((c) => c.id !== contributionId));
  }, []);

  // `sourceCategoryId`: categoría de donde sale la plata (se descuenta de su
  // saldo). Null/vacío = plata de afuera, que no descuenta de ninguna.
  const addContribution = useCallback(async (goalId, monto, sourceCategoryId) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto del aporte debe ser mayor a 0.');

    const { data, error: insertError } = await supabase
      .from('savings_contributions')
      .insert({
        goal_id: goalId,
        user_id: userId,
        monto,
        ...(sourceCategoryId ? { source_category_id: sourceCategoryId } : {}),
      })
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

  return { goals, contributions, loading, error, addGoal, updateGoal, deleteGoal, setGoalCompleted, addContribution, updateContribution, deleteContribution, totalByGoal, refetch: fetchAll };
}

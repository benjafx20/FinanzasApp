import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, withSessionRetry } from '../lib/supabaseClient';
import { fechaInicioPlan } from '../utils/weeklyPlan';

export function useWeeklyPlans(userId) {
  const [plans, setPlans] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cargadoRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);
    const [pl, cl] = await Promise.all([
      withSessionRetry(() => supabase.from('weekly_plans').select('*').order('created_at', { ascending: false })),
      withSessionRetry(() => supabase.from('weekly_plan_closures').select('*')),
    ]);
    if (pl.error || cl.error) {
      const e = pl.error || cl.error;
      console.error('[useWeeklyPlans] fetchAll:', e);
      setError(`No se pudo cargar el presupuesto semanal: ${e.message}`);
    } else {
      setPlans(pl.data);
      setClosures(cl.data);
    }
    setLoading(false);
    cargadoRef.current = true;
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // modo: 'esta' (parte hoy) o 'lunes' (parte el próximo lunes).
  const createPlan = useCallback(
    async ({ categoryId, monto, semanas, modo, sobranteCategoryId }) => {
      if (!userId) throw new Error('Debes iniciar sesión.');
      if (!monto || monto <= 0) throw new Error('El monto semanal debe ser mayor a 0.');
      if (!Number.isInteger(semanas) || semanas < 1 || semanas > 52) {
        throw new Error('Las semanas deben ser un número entre 1 y 52.');
      }
      if (plans.some((p) => p.category_id === categoryId && p.estado === 'activo')) {
        throw new Error('Esta categoría ya tiene un presupuesto semanal activo.');
      }

      const { data, error: insertError } = await withSessionRetry(() =>
        supabase
          .from('weekly_plans')
          .insert({
            user_id: userId,
            category_id: categoryId,
            monto_semanal: monto,
            semanas,
            fecha_inicio: fechaInicioPlan(modo),
            sobrante_category_id: sobranteCategoryId || null,
          })
          .select()
          .single()
      );
      if (insertError) {
        console.error('[useWeeklyPlans] createPlan:', insertError);
        throw new Error(`No se pudo crear el presupuesto semanal: ${insertError.message}`);
      }

      // Si el presupuesto anterior de esta categoría terminó con deuda, pasa al nuevo.
      const anterior = plans.find((p) => p.category_id === categoryId && p.estado === 'terminado');
      const cierreFinal = anterior && closures.find((c) => c.plan_id === anterior.id && c.semana_num === anterior.semanas);
      const nuevosCierres = [];
      if (cierreFinal && Number(cierreFinal.deuda_arrastrada) > 0) {
        const { data: c0 } = await supabase
          .from('weekly_plan_closures')
          .insert({
            user_id: userId,
            plan_id: data.id,
            semana_num: 0,
            deuda_arrastrada: cierreFinal.deuda_arrastrada,
          })
          .select()
          .single();
        if (c0) nuevosCierres.push(c0);
      }

      setPlans((prev) => [data, ...prev]);
      if (nuevosCierres.length) setClosures((prev) => [...nuevosCierres, ...prev]);
      return data;
    },
    [userId, plans, closures]
  );

  const stopPlan = useCallback(async (planId) => {
    const { data, error: updateError } = await supabase
      .from('weekly_plans')
      .update({ estado: 'apagado' })
      .eq('id', planId)
      .select()
      .single();
    if (updateError) throw new Error('No se pudo apagar el presupuesto semanal.');
    setPlans((prev) => prev.map((p) => (p.id === planId ? data : p)));
  }, []);

  return { plans, closures, loading, error, createPlan, stopPlan, refetch: fetchAll };
}

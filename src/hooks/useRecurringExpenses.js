import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// La generación automática de gastos recurrentes ya NO ocurre acá en el
// navegador: corre en el servidor todos los días vía una Supabase Edge
// Function programada con cron (ver supabase/functions/generate-recurring-expenses
// y supabase/cron.sql). Este hook solo maneja el CRUD de las plantillas.
export function useRecurringExpenses(userId) {
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecurring = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*, categories(id, nombre, icono, color)')
      .order('dia_mes');

    if (fetchError) {
      setError('No se pudieron cargar los gastos recurrentes.');
      setLoading(false);
      return;
    }
    setRecurring(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const addRecurring = useCallback(async ({ categoryId, nombre, monto, diaMes }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!nombre.trim()) throw new Error('Ponle un nombre al gasto recurrente.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!diaMes || diaMes < 1 || diaMes > 31) throw new Error('El día debe estar entre 1 y 31.');

    const { data, error: insertError } = await supabase
      .from('recurring_expenses')
      .insert({ user_id: userId, category_id: categoryId, nombre: nombre.trim(), monto, dia_mes: diaMes })
      .select('*, categories(id, nombre, icono, color)')
      .single();

    if (insertError) throw new Error('No se pudo crear el gasto recurrente.');
    setRecurring((prev) => [...prev, data].sort((a, b) => a.dia_mes - b.dia_mes));
    return data;
  }, [userId]);

  const toggleActivo = useCallback(async (id, activo) => {
    const { data, error: updateError } = await supabase
      .from('recurring_expenses')
      .update({ activo })
      .eq('id', id)
      .select('*, categories(id, nombre, icono, color)')
      .single();

    if (updateError) throw new Error('No se pudo actualizar.');
    setRecurring((prev) => prev.map((r) => (r.id === id ? data : r)));
  }, []);

  const deleteRecurring = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('recurring_expenses').delete().eq('id', id);
    if (deleteError) throw new Error('No se pudo eliminar.');
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recurring, loading, error, addRecurring, toggleActivo, deleteRecurring, refetch: fetchRecurring };
}

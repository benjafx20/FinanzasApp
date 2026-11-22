import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllPages } from '../lib/fetchAll';
import { supabase, withSessionRetry } from '../lib/supabaseClient';
import { hoyISO } from '../utils/dates';
import { nuevoId, mezclarConPendientes, estaPendiente, insertarOEncolar, MENSAJE_PENDIENTE } from '../utils/offlineOps';

export function useIncomes(userId) {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga muestra Cargando; al volver a la app se
  // refresca en silencio para que la lista no parpadee.
  const cargadoRef = useRef(false);
  const [error, setError] = useState(null);

  const fetchIncomes = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);
    const { data, error: fetchError } = await withSessionRetry(() =>
      // Mismo desempate que en useExpenses: `fecha` no tiene hora, así que se
      // ordena también por `created_at` para que el orden dentro de un mismo
      // día sea estable y no dependa de detalles como si tiene nota o no.
      fetchAllPages(() =>
        supabase
          .from('incomes')
          .select('*')
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
      )
    );

    if (fetchError) {
      console.error('[useIncomes] fetchIncomes:', fetchError);
      setError(`No se pudieron cargar los ingresos: ${fetchError.message}`);
      setLoading(false);
      cargadoRef.current = true;
      return;
    }
    // Lo registrado sin conexión que aún no sube se muestra igual, marcado como pendiente.
    setIncomes(mezclarConPendientes(userId, 'income', data));
    setLoading(false);
    cargadoRef.current = true;
  }, [userId]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const addIncome = useCallback(async ({ monto, fecha, nota }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    // El id se crea aquí: si hay que repetir la subida, no se duplica.
    const fila = { id: nuevoId(), user_id: userId, monto, fecha: fecha || hoyISO(), nota };
    const res = await insertarOEncolar({
      userId,
      kind: 'income',
      filas: [fila],
      insertar: () => withSessionRetry(() => supabase.from('incomes').insert(fila).select()),
    });

    if (res.error) {
      console.error('[useIncomes] addIncome:', res.error);
      throw new Error(`No se pudo registrar el ingreso: ${res.error.message}`);
    }
    const creado = res.filas[0];
    setIncomes((prev) => [creado, ...prev]);
    return creado;
  }, [userId]);

  const updateIncome = useCallback(async (incomeId, { monto, fecha, nota }) => {
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (estaPendiente(userId, incomeId)) throw new Error(MENSAJE_PENDIENTE);

    const { data, error: updateError } = await supabase
      .from('incomes')
      .update({ monto, fecha, nota })
      .eq('id', incomeId)
      .select()
      .single();

    if (updateError) throw new Error('No se pudo actualizar el ingreso.');
    setIncomes((prev) => prev.map((i) => (i.id === incomeId ? data : i)));
    return data;
  }, [userId]);

  const deleteIncome = useCallback(async (incomeId) => {
    if (estaPendiente(userId, incomeId)) throw new Error(MENSAJE_PENDIENTE);
    const { error: deleteError } = await supabase.from('incomes').delete().eq('id', incomeId);
    if (deleteError) throw new Error('No se pudo eliminar el ingreso.');
    setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
  }, [userId]);

  return { incomes, loading, error, addIncome, updateIncome, deleteIncome, refetch: fetchIncomes };
}

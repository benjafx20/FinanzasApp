import { useState, useEffect, useCallback, useRef } from 'react';
import { hoyISO } from '../utils/dates';
import { supabase } from '../lib/supabaseClient';

// 'prestado': le prestaste plata a alguien (te deben).
// 'debo': tú le debes plata a alguien.
// Por defecto es un registro informativo. Si al crearla (o al saldarla) se elige
// una categoría, la deuda sí mueve plata: ver utils/debtMovements.js.
export function useDebts(userId) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga muestra Cargando; al volver a la app se
  // refresca en silencio para que la lista no parpadee.
  const cargadoRef = useRef(false);
  const [error, setError] = useState(null);

  const fetchDebts = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .order('pagado', { ascending: true })
      .order('fecha', { ascending: false });

    if (fetchError) {
      setError('No se pudieron cargar las deudas y préstamos.');
      setLoading(false);
      cargadoRef.current = true;
      return;
    }
    setDebts(data);
    setLoading(false);
    cargadoRef.current = true;
  }, [userId]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const addDebt = useCallback(async ({ persona, tipo, monto, nota, fecha, sourceCategoryId }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!persona.trim()) throw new Error('Falta el nombre de la persona.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    if (!['prestado', 'debo'].includes(tipo)) throw new Error('Tipo inválido.');

    const { data, error: insertError } = await supabase
      .from('debts')
      .insert({
        user_id: userId,
        persona: persona.trim(),
        tipo,
        monto,
        nota: nota?.trim() || null,
        fecha: fecha || hoyISO(),
        ...(tipo === 'prestado' && sourceCategoryId ? { source_category_id: sourceCategoryId } : {}),
      })
      .select()
      .single();

    if (insertError) throw new Error('No se pudo registrar. Intenta de nuevo.');
    setDebts((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  // Edita persona, monto, fecha y nota. En un préstamo también la categoría de
  // la que salió la plata (sourceCategoryId; null = solo registro).
  const updateDebt = useCallback(async (debtId, { persona, tipo, monto, nota, fecha, sourceCategoryId }) => {
    if (!persona.trim()) throw new Error('Falta el nombre de la persona.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');
    const cambios = { persona: persona.trim(), monto, nota: nota?.trim() || null, fecha };
    if (tipo === 'prestado' && sourceCategoryId !== undefined) cambios.source_category_id = sourceCategoryId || null;

    const { data, error: updateError } = await supabase
      .from('debts')
      .update(cambios)
      .eq('id', debtId)
      .select()
      .single();
    if (updateError) throw new Error('No se pudo editar. Intenta de nuevo.');
    setDebts((prev) => prev.map((d) => (d.id === debtId ? data : d)));
    return data;
  }, []);

  // Saldar una deuda. `categoryId`: en un préstamo, la categoría a la que entra lo
  // que te devolvieron; en una deuda tuya, la categoría de la que sale lo que pagaste.
  // Null = solo marcar como saldada, sin mover plata.
  const markAsPaid = useCallback(async (debtId, { tipo, categoryId } = {}) => {
    const destino = tipo === 'prestado' ? { destination_category_id: categoryId || null } : { source_category_id: categoryId || null };
    const { data, error: updateError } = await supabase
      .from('debts')
      .update({ pagado: true, fecha_pago: hoyISO(), ...destino })
      .eq('id', debtId)
      .select()
      .single();

    if (updateError) throw new Error('No se pudo marcar como pagada.');
    setDebts((prev) => prev.map((d) => (d.id === debtId ? data : d)));
    return data;
  }, []);

  const deleteDebt = useCallback(async (debtId) => {
    const { error: deleteError } = await supabase.from('debts').delete().eq('id', debtId);
    if (deleteError) throw new Error('No se pudo eliminar.');
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
  }, []);

  return { debts, loading, error, addDebt, updateDebt, markAsPaid, deleteDebt, refetch: fetchDebts };
}

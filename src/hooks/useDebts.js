import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// 'prestado': le prestaste plata a alguien (te deben).
// 'debo': tú le debes plata a alguien.
// Es un registro informativo, independiente del saldo real de las
// categorías — no mueve plata entre categorías ni cuenta como gasto/ingreso.
export function useDebts(userId) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDebts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .order('pagado', { ascending: true })
      .order('fecha', { ascending: false });

    if (fetchError) {
      setError('No se pudieron cargar las deudas y préstamos.');
      setLoading(false);
      return;
    }
    setDebts(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const addDebt = useCallback(async ({ persona, tipo, monto, nota, fecha }) => {
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
        fecha: fecha || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (insertError) throw new Error('No se pudo registrar. Intenta de nuevo.');
    setDebts((prev) => [data, ...prev]);
    return data;
  }, [userId]);

  const markAsPaid = useCallback(async (debtId) => {
    const { data, error: updateError } = await supabase
      .from('debts')
      .update({ pagado: true, fecha_pago: new Date().toISOString().slice(0, 10) })
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

  return { debts, loading, error, addDebt, markAsPaid, deleteDebt, refetch: fetchDebts };
}

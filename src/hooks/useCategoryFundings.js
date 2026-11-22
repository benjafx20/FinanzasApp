import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllPages } from '../lib/fetchAll';
import { renombrarEtiqueta } from '../utils/etiquetas';
import { supabase, withSessionRetry } from '../lib/supabaseClient';
import { hoyISO } from '../utils/dates';
import {
  nuevoId,
  mezclarConPendientes,
  estaPendiente,
  hayAportesPendientesDeIngreso,
  insertarOEncolar,
  renombrarEtiquetaEnCola,
  MENSAJE_PENDIENTE,
} from '../utils/offlineOps';

export function useCategoryFundings(userId) {
  const [fundings, setFundings] = useState([]);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga muestra Cargando; al volver a la app se
  // refresca en silencio para que la lista no parpadee.
  const cargadoRef = useRef(false);
  const [error, setError] = useState(null);

  const fetchFundings = useCallback(async () => {
    if (!userId) return;
    if (!cargadoRef.current) setLoading(true);
    setError(null);
    const { data, error: fetchError } = await withSessionRetry(() =>
      fetchAllPages(() =>
        supabase.from('category_fundings').select('*').order('created_at', { ascending: false }).order('id')
      )
    );

    if (fetchError) {
      console.error('[useCategoryFundings] fetchFundings:', fetchError);
      setError(`No se pudieron cargar los aportes a categorías: ${fetchError.message}`);
      setLoading(false);
      cargadoRef.current = true;
      return;
    }
    // Aportes hechos sin conexión que aún no suben: se muestran y cuentan en el saldo.
    setFundings(mezclarConPendientes(userId, 'funding', data));
    setLoading(false);
    cargadoRef.current = true;
  }, [userId]);

  useEffect(() => {
    fetchFundings();
  }, [fetchFundings]);

  // Aporte manual directo a una categoría (ej: vendiste algo y le sumas esa plata).
  // `incomeId` (opcional): si este aporte viene de un ingreso creado junto con él
  // (ver `handleAddFunding` en Dashboard), para dejarlo enlazado.
  const addManualFunding = useCallback(async ({ categoryId, monto, nota, incomeId, etiqueta }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!monto || monto <= 0) throw new Error('El monto debe ser mayor a 0.');

    const fila = {
      id: nuevoId(),
      user_id: userId,
      category_id: categoryId,
      monto,
      origen: 'manual',
      nota: nota?.trim() || null,
      income_id: incomeId || null,
      etiqueta: etiqueta?.trim() || null,
      fecha: hoyISO(),
    };
    const res = await insertarOEncolar({
      userId,
      kind: 'funding',
      filas: [fila],
      // Si el ingreso del que cuelga todavía no subió, este aporte también espera.
      forzarCola: !!incomeId && estaPendiente(userId, incomeId),
      insertar: () => withSessionRetry(() => supabase.from('category_fundings').insert(fila).select()),
    });

    if (res.error) {
      console.error('[useCategoryFundings] addManualFunding:', res.error);
      throw new Error(`No se pudo agregar la plata a la categoría: ${res.error.message}`);
    }
    const creado = res.filas[0];
    setFundings((prev) => [creado, ...prev]);
    return creado;
  }, [userId]);

  // Reparte un ingreso ya registrado entre varias categorías de una vez.
  // `reparto` es un array de { categoryId, monto }.
  const addIncomeFundings = useCallback(async (incomeId, reparto, etiqueta) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    const filas = reparto
      .filter((r) => r.monto > 0)
      .map((r) => ({
        id: nuevoId(),
        user_id: userId,
        category_id: r.categoryId,
        monto: r.monto,
        origen: 'ingreso',
        income_id: incomeId,
        etiqueta: etiqueta?.trim() || null,
        fecha: hoyISO(),
      }));
    if (filas.length === 0) return [];

    const res = await insertarOEncolar({
      userId,
      kind: 'funding',
      filas,
      // Si el ingreso aún espera subir, el reparto también (siempre después de él).
      forzarCola: estaPendiente(userId, incomeId),
      insertar: () => withSessionRetry(() => supabase.from('category_fundings').insert(filas).select()),
    });
    if (res.error) throw new Error('El ingreso se registró, pero no se pudo repartir entre categorías.');
    setFundings((prev) => [...res.filas, ...prev]);
    return res.filas;
  }, [userId]);

  // Quita de una vez todos los aportes de un ingreso (una sola operación, así no
  // quedan a medias si se corta la conexión).
  const deleteFundingsByIncome = useCallback(async (incomeId) => {
    if (estaPendiente(userId, incomeId) || hayAportesPendientesDeIngreso(userId, incomeId)) {
      throw new Error(MENSAJE_PENDIENTE);
    }
    const { error: deleteError } = await supabase.from('category_fundings').delete().eq('income_id', incomeId);
    if (deleteError) throw new Error('No se pudieron quitar los aportes del ingreso.');
    setFundings((prev) => prev.filter((f) => f.income_id !== incomeId));
  }, [userId]);

  const deleteFunding = useCallback(async (id) => {
    if (estaPendiente(userId, id)) throw new Error(MENSAJE_PENDIENTE);
    const { error: deleteError } = await supabase.from('category_fundings').delete().eq('id', id);
    if (deleteError) throw new Error('No se pudo eliminar el aporte.');
    setFundings((prev) => prev.filter((f) => f.id !== id));
  }, [userId]);

  // Edita un aporte ya existente. `cambios` puede traer cualquiera de:
  // monto, fecha, nota, etiqueta (solo se tocan los que vengan).
  const updateFunding = useCallback(async (id, cambios) => {
    if (estaPendiente(userId, id)) throw new Error(MENSAJE_PENDIENTE);
    const fila = {};
    if ('monto' in cambios) {
      const m = Number(cambios.monto);
      if (!m || m <= 0) throw new Error('El monto debe ser mayor a 0.');
      fila.monto = m;
    }
    if ('fecha' in cambios) {
      if (!cambios.fecha) throw new Error('Falta la fecha.');
      fila.fecha = cambios.fecha;
    }
    if ('nota' in cambios) fila.nota = cambios.nota?.trim() || null;
    if ('etiqueta' in cambios) fila.etiqueta = cambios.etiqueta?.trim() || null;

    const { data, error: updateError } = await supabase
      .from('category_fundings')
      .update(fila)
      .eq('id', id)
      .select()
      .single();
    if (updateError) {
      console.error('[useCategoryFundings] updateFunding:', updateError);
      throw new Error('No se pudo editar el aporte.');
    }
    setFundings((prev) => prev.map((f) => (f.id === id ? data : f)));
    return data;
  }, [userId]);

  const totalPorCategoria = useCallback(() => {
    const map = {};
    for (const f of fundings) {
      map[f.category_id] = (map[f.category_id] || 0) + Number(f.monto);
    }
    return map;
  }, [fundings]);

  // Cambia el nombre de un grupo en todos los aportes de una categoría.
  const renameEtiqueta = useCallback(async (categoryId, de, a) => {
    const { error: updateError } = await supabase
      .from('category_fundings')
      .update({ etiqueta: a })
      .eq('category_id', categoryId)
      .eq('etiqueta', de);
    if (updateError) throw new Error('No se pudo cambiar el nombre en los aportes.');
    renombrarEtiquetaEnCola(userId, categoryId, de, a);
    setFundings((prev) => renombrarEtiqueta(prev, categoryId, de, a));
  }, [userId]);

  return { fundings, loading, error, addManualFunding, addIncomeFundings, updateFunding, deleteFunding, deleteFundingsByIncome, renameEtiqueta, totalPorCategoria, refetch: fetchFundings };
}

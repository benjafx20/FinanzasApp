import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { claveEquipo, estadoKey } from '../utils/inventory';

// Equipos que ya no se van a vender: 'repuesto' (queda solo para repuestos) o
// 'perdida' (dado por pérdida). Dejan de salir como "sin vender" y de generar avisos.
export function useInventoryStatus(userId) {
  const [estados, setEstados] = useState({});
  const estadosRef = useRef({});
  useEffect(() => {
    estadosRef.current = estados;
  }, [estados]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelado = false;
    supabase
      .from('inventory_status')
      .select('category_id, etiqueta_key, estado')
      .then(({ data, error }) => {
        if (cancelado || error || !data) return;
        setEstados(Object.fromEntries(data.map((r) => [`${r.category_id}|${r.etiqueta_key}`, r.estado])));
      });
    return () => {
      cancelado = true;
    };
  }, [userId]);

  // estado: 'repuesto' | 'perdida' | null (null = vuelve a inventario).
  const setEstado = useCallback(
    async (categoryId, nombre, estado) => {
      const key = claveEquipo(nombre);
      if (estado) {
        const { error } = await supabase.from('inventory_status').upsert(
          { user_id: userId, category_id: categoryId, etiqueta_key: key, estado, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,category_id,etiqueta_key' }
        );
        if (error) throw new Error('No se pudo guardar. ¿Corriste el SQL de Supabase?');
      } else {
        const { error } = await supabase
          .from('inventory_status')
          .delete()
          .eq('category_id', categoryId)
          .eq('etiqueta_key', key);
        if (error) throw new Error('No se pudo actualizar el equipo.');
      }
      setEstados((prev) => {
        const siguiente = { ...prev };
        if (estado) siguiente[estadoKey(categoryId, nombre)] = estado;
        else delete siguiente[estadoKey(categoryId, nombre)];
        return siguiente;
      });
    },
    [userId]
  );

  // Si se le cambia el nombre a un equipo, su estado se va con él.
  const renombrar = useCallback(
    async (categoryId, de, a) => {
      const estado = estadosRef.current[estadoKey(categoryId, de)];
      if (!estado) return;
      await setEstado(categoryId, de, null);
      await setEstado(categoryId, a, estado);
    },
    [setEstado]
  );

  return { estados, setEstado, renombrar };
}

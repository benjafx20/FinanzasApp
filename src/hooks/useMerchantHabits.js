import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { normalizarComercio } from '../utils/habits';

// Recuerda la categoría que usas con cada comercio. Aprender nunca bloquea el
// guardado de un gasto: si falla (o falta la tabla), simplemente no aprende.
export function useMerchantHabits(userId) {
  const [cantidad, setCantidad] = useState(0);
  const mapaRef = useRef({});

  useEffect(() => {
    if (!userId) return undefined;
    let cancelado = false;
    supabase
      .from('merchant_categories')
      .select('comercio_key, category_id')
      .then(({ data, error }) => {
        if (cancelado || error || !data) return;
        mapaRef.current = Object.fromEntries(data.map((r) => [r.comercio_key, r.category_id]));
        setCantidad(data.length);
      });
    return () => {
      cancelado = true;
    };
  }, [userId]);

  // category_id aprendido para ese comercio, o null.
  const lookup = useCallback((texto) => mapaRef.current[normalizarComercio(texto)] || null, []);

  // Si la categoría cambió, la actualiza: lo último que elegiste es lo que vale.
  const learn = useCallback(
    async (texto, categoryId) => {
      const key = normalizarComercio(texto);
      if (!userId || !key || !categoryId || mapaRef.current[key] === categoryId) return;
      const { error } = await supabase
        .from('merchant_categories')
        .upsert(
          { user_id: userId, comercio_key: key, category_id: categoryId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,comercio_key' }
        );
      if (error) {
        console.warn('[useMerchantHabits] no se pudo aprender:', error.message);
        return;
      }
      mapaRef.current = { ...mapaRef.current, [key]: categoryId };
      setCantidad(Object.keys(mapaRef.current).length);
    },
    [userId]
  );

  return { lookup, learn, cantidad };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Combina las categorías (globales + propias) con las preferencias del
// usuario (orden y si está oculta), ordena por orden personalizado y
// filtra las ocultas para uso normal, pero deja `allCategories` disponible
// (sin filtrar) para la pantalla de gestión de categorías.
export function useCategories(userId) {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const [catRes, prefRes] = await Promise.all([
      supabase.from('categories').select('*').order('nombre'),
      supabase.from('category_preferences').select('*').eq('user_id', userId),
    ]);

    if (catRes.error || prefRes.error) {
      setError('No se pudieron cargar las categorías.');
      setLoading(false);
      return;
    }

    const prefsByCategory = {};
    for (const p of prefRes.data) prefsByCategory[p.category_id] = p;

    const merged = catRes.data
      .map((cat) => ({
        ...cat,
        orden: prefsByCategory[cat.id]?.orden ?? null,
        oculta: prefsByCategory[cat.id]?.oculta ?? false,
      }))
      .sort((a, b) => {
        if (a.orden != null && b.orden != null) return a.orden - b.orden;
        if (a.orden != null) return -1;
        if (b.orden != null) return 1;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

    setAllCategories(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const categories = allCategories.filter((c) => !c.oculta);

  const addCategory = useCallback(async ({ nombre, icono, color }) => {
    if (!userId) throw new Error('Debes iniciar sesión.');
    if (!nombre.trim()) throw new Error('Ponle un nombre a la categoría.');
    if (!icono) throw new Error('Elige un ícono.');
    if (!color) throw new Error('Elige un color.');

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({ user_id: userId, nombre: nombre.trim(), icono, color })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') throw new Error('Ya tienes una categoría con ese nombre.');
      throw new Error('No se pudo crear la categoría. Intenta de nuevo.');
    }
    await fetchCategories();
    return data;
  }, [userId, fetchCategories]);

  const setHidden = useCallback(async (categoryId, oculta) => {
    const { error: upsertError } = await supabase
      .from('category_preferences')
      .upsert({ user_id: userId, category_id: categoryId, oculta }, { onConflict: 'user_id,category_id' });

    if (upsertError) throw new Error('No se pudo actualizar la categoría.');
    setAllCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, oculta } : c)));
  }, [userId]);

  // Reordena moviendo una categoría una posición arriba (-1) o abajo (+1)
  // dentro de la lista completa (incluye ocultas), reasignando el campo
  // `orden` de todas según su nueva posición.
  const moveCategory = useCallback(async (categoryId, direction) => {
    const index = allCategories.findIndex((c) => c.id === categoryId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= allCategories.length) return;

    const reordered = [...allCategories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const updates = reordered.map((c, i) => ({ user_id: userId, category_id: c.id, orden: i, oculta: c.oculta }));
    const { error: upsertError } = await supabase
      .from('category_preferences')
      .upsert(updates, { onConflict: 'user_id,category_id' });

    if (upsertError) throw new Error('No se pudo reordenar.');
    await fetchCategories();
  }, [allCategories, userId, fetchCategories]);

  // Antes de borrar, revisa si la categoría está en uso (gastos, gastos
  // recurrentes o presupuestos) para poder avisarle al usuario. El borrado
  // en sí nunca elimina gastos: la base de datos los deja "sin categoría".
  const checkCategoryUsage = useCallback(async (categoryId) => {
    const [expRes, recRes] = await Promise.all([
      supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('category_id', categoryId),
      supabase.from('recurring_expenses').select('id', { count: 'exact', head: true }).eq('category_id', categoryId),
    ]);
    return { gastos: expRes.count ?? 0, recurrentes: recRes.count ?? 0 };
  }, []);

  const updateCategory = useCallback(async (categoryId, { nombre, icono, color }) => {
    if (!nombre.trim()) throw new Error('Ponle un nombre a la categoría.');
    if (!icono) throw new Error('Elige un ícono.');
    if (!color) throw new Error('Elige un color.');

    const { data, error: updateError } = await supabase
      .from('categories')
      .update({ nombre: nombre.trim(), icono, color })
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') throw new Error('Ya tienes una categoría con ese nombre.');
      throw new Error('No se pudo editar la categoría. Puede que no sea tuya (las predefinidas no se pueden editar).');
    }
    await fetchCategories();
    return data;
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (categoryId) => {
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', categoryId);
    if (deleteError) throw new Error('No se pudo eliminar la categoría. Puede que no sea tuya (las predefinidas solo se pueden ocultar).');
    await fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    allCategories,
    loading,
    error,
    addCategory,
    updateCategory,
    setHidden,
    moveCategory,
    checkCategoryUsage,
    deleteCategory,
    refetch: fetchCategories,
  };
}

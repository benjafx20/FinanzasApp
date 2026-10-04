-- PARTE 2b: permitir editar el grupo ("agrupar como") de un aporte ya creado.
-- Hasta ahora la tabla solo permitía leer, crear y borrar aportes; falta el permiso de actualizar.
-- Pegar en Supabase > SQL Editor > New query > Run. Es seguro ejecutarlo más de una vez.

drop policy if exists "category_fundings_update_own" on category_fundings;
create policy "category_fundings_update_own"
  on category_fundings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

// Los movimientos que crea solo el cierre semanal ("Sobrante semana N ...") se
// repiten cada semana y llenarían la lista; por defecto no se muestran.
export function esMovimientoAutomatico(t) {
  return (t.nota || '').startsWith('Sobrante semana');
}

// Qué movimientos se ven: por defecto solo los últimos `limite` que no son
// automáticos; con `verTodos`, absolutamente todos.
export function movimientosVisibles(transfers, { verTodos = false, limite = 5 } = {}) {
  if (verTodos) return transfers;
  return transfers.filter((t) => !esMovimientoAutomatico(t)).slice(0, limite);
}

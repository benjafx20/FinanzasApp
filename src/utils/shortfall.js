// Cuando una categoría no tiene plata suficiente para algo (un gasto, un aporte a
// una meta, un préstamo, un presupuesto semanal), se avisa y se deja elegir de
// qué otra categoría sacar lo que falta.
// faltante = cuánto falta para que la categoría no quede bajo cero (0 si alcanza).
export function calcularFaltante({ saldo, monto }) {
  return Math.max(0, Number(monto) - Number(saldo));
}

// Categorías desde las que se puede traer el faltante: las que tienen al menos esa plata.
export function opcionesParaCubrir({ categorias, saldoPorCategoria, excluirId, faltante }) {
  return categorias
    .filter((c) => c.id !== excluirId && (saldoPorCategoria[c.id] || 0) >= faltante)
    .map((c) => ({ id: c.id, nombre: c.nombre, saldo: saldoPorCategoria[c.id] || 0 }))
    .sort((a, b) => b.saldo - a.saldo);
}

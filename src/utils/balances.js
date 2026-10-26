// Saldo real de cada categoría. Es el cálculo central de la app, por eso vive
// aparte de la pantalla (y tiene pruebas).
//
//   saldo = aportes (ingresos repartidos y "+ Agregar plata")
//         + traspasos recibidos − traspasos enviados
//         − gastos que salen de su plata (propios, o pagados con su saldo)
//         − lo mandado a metas de ahorro desde ella
//         ± deudas que movieron plata (préstamos, devoluciones, pagos)
//
// `asignado` es lo que se le ha dado a la categoría (aportes + traspasos netos),
// sin descontar lo gastado.
export function calcularSaldos({
  categories = [],
  expenses = [],
  fundings = [],
  transfers = [],
  contributions = [],
  movimientosDeuda = [],
}) {
  const aportes = {};
  for (const f of fundings) aportes[f.category_id] = (aportes[f.category_id] || 0) + Number(f.monto);

  const neto = {};
  for (const t of transfers) {
    neto[t.to_category_id] = (neto[t.to_category_id] || 0) + Number(t.monto);
    neto[t.from_category_id] = (neto[t.from_category_id] || 0) - Number(t.monto);
  }

  // El gasto baja el saldo de la categoría que lo financió (funding_category_id)
  // o, si no hay, de la suya.
  const gastado = {};
  for (const e of expenses) {
    const origen = e.funding_category_id || e.category_id;
    if (!origen) continue;
    gastado[origen] = (gastado[origen] || 0) + Number(e.monto);
  }

  const ahorrado = {};
  for (const c of contributions) {
    if (c.source_category_id) ahorrado[c.source_category_id] = (ahorrado[c.source_category_id] || 0) + Number(c.monto);
  }

  const deuda = {};
  for (const m of movimientosDeuda) deuda[m.category_id] = (deuda[m.category_id] || 0) + m.monto;

  const asignadoPorCategoria = {};
  const saldoPorCategoria = {};
  for (const cat of categories) {
    const asignado = (aportes[cat.id] || 0) + (neto[cat.id] || 0);
    asignadoPorCategoria[cat.id] = asignado;
    saldoPorCategoria[cat.id] = asignado - (gastado[cat.id] || 0) - (ahorrado[cat.id] || 0) + (deuda[cat.id] || 0);
  }
  return { asignadoPorCategoria, saldoPorCategoria };
}

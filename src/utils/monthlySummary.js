// Calcula los datos del "resumen de cierre de mes": cuánto se gastó, cómo
// se compara con el mes anterior, la categoría más pesada, cuánto se
// ahorró, y el balance total tal como quedó al último día de ese mes
// (no el balance de HOY — el de ESE momento, reconstruido desde el
// historial completo de aportes/traspasos/gastos).

function ultimoDiaDelMes(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  // Día 0 del mes siguiente = último día de este mes.
  const ultimo = new Date(y, m, 0);
  return ultimo.toISOString().slice(0, 10);
}

export function mesAnteriorA(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Todos los meses con algún movimiento (gasto, aporte, traspaso o ahorro),
// sin contar el mes actual (ese no está "cerrado" todavía), del más
// reciente al más antiguo.
export function getClosedMonths({ expenses = [], fundings = [], transfers = [], contributions = [] }, currentMonthKey) {
  const keys = new Set();
  for (const e of expenses) keys.add(e.fecha.slice(0, 7));
  for (const f of fundings) keys.add(f.fecha.slice(0, 7));
  for (const t of transfers) keys.add(t.fecha.slice(0, 7));
  for (const c of contributions) keys.add(c.fecha.slice(0, 7));
  keys.delete(currentMonthKey);
  return Array.from(keys).sort().reverse();
}

export function buildMonthlySummary({ monthKey, expenses = [], fundings = [], transfers = [], contributions = [], categories = [] }) {
  const enEsteMes = (fecha) => fecha.slice(0, 7) === monthKey;
  const corte = ultimoDiaDelMes(monthKey);
  const hastaElCorte = (fecha) => fecha <= corte;

  const gastosDelMes = expenses.filter((e) => enEsteMes(e.fecha));
  const totalGastado = gastosDelMes.reduce((sum, e) => sum + Number(e.monto), 0);

  const mesAnteriorKey = mesAnteriorA(monthKey);
  const totalMesAnterior = expenses
    .filter((e) => e.fecha.slice(0, 7) === mesAnteriorKey)
    .reduce((sum, e) => sum + Number(e.monto), 0);
  const cambioPct = totalMesAnterior > 0
    ? Math.round(((totalGastado - totalMesAnterior) / totalMesAnterior) * 100)
    : null;

  const gastoPorCategoria = {};
  for (const e of gastosDelMes) {
    if (!e.category_id) continue;
    gastoPorCategoria[e.category_id] = (gastoPorCategoria[e.category_id] || 0) + Number(e.monto);
  }
  let categoriaTop = null;
  let categoriaTopMonto = 0;
  for (const [catId, monto] of Object.entries(gastoPorCategoria)) {
    if (monto > categoriaTopMonto) {
      categoriaTopMonto = monto;
      categoriaTop = categories.find((c) => c.id === catId) || null;
    }
  }

  const ahorroLogrado = contributions
    .filter((c) => enEsteMes(c.fecha))
    .reduce((sum, c) => sum + Number(c.monto), 0);

  // Reconstruye el saldo real como estaba al cierre de ese mes, con la
  // misma fórmula que usa el Dashboard para el balance de HOY, pero
  // considerando solo los movimientos hasta esa fecha.
  const fundingsHastaCorte = fundings.filter((f) => hastaElCorte(f.fecha));
  const transfersHastaCorte = transfers.filter((t) => hastaElCorte(t.fecha));
  const expensesHastaCorte = expenses.filter((e) => hastaElCorte(e.fecha));

  const aportesPorCategoria = {};
  for (const f of fundingsHastaCorte) {
    aportesPorCategoria[f.category_id] = (aportesPorCategoria[f.category_id] || 0) + Number(f.monto);
  }
  const netoTransferenciasPorCategoria = {};
  for (const t of transfersHastaCorte) {
    netoTransferenciasPorCategoria[t.to_category_id] = (netoTransferenciasPorCategoria[t.to_category_id] || 0) + Number(t.monto);
    netoTransferenciasPorCategoria[t.from_category_id] = (netoTransferenciasPorCategoria[t.from_category_id] || 0) - Number(t.monto);
  }
  const gastadoParaSaldoPorCategoria = {};
  for (const e of expensesHastaCorte) {
    const origenSaldo = e.funding_category_id || e.category_id;
    if (!origenSaldo) continue;
    gastadoParaSaldoPorCategoria[origenSaldo] = (gastadoParaSaldoPorCategoria[origenSaldo] || 0) + Number(e.monto);
  }

  let balanceAlCierre = 0;
  for (const cat of categories) {
    const aportes = aportesPorCategoria[cat.id] || 0;
    const neto = netoTransferenciasPorCategoria[cat.id] || 0;
    const gastado = gastadoParaSaldoPorCategoria[cat.id] || 0;
    balanceAlCierre += aportes + neto - gastado;
  }

  return {
    monthKey,
    totalGastado,
    cambioPct,
    categoriaTop,
    categoriaTopMonto,
    ahorroLogrado,
    balanceAlCierre,
  };
}

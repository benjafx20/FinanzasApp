// Calcula los datos del "resumen de cierre de mes": cuánto se gastó, cómo
// se compara con el mes anterior, la categoría más pesada, cuánto se
// ahorró, y el balance total tal como quedó al último día de ese mes
// (no el balance de HOY — el de ESE momento, reconstruido desde el
// historial completo de aportes/traspasos/gastos).

import { fechaLocalISO } from './dates';
import { movimientosDeDeudas } from './debtMovements';

function ultimoDiaDelMes(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  // Día 0 del mes siguiente = último día de este mes.
  const ultimo = new Date(y, m, 0);
  return fechaLocalISO(ultimo);
}

export function mesAnteriorA(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Todos los meses con algún movimiento (gasto, aporte, traspaso o ahorro),
// sin contar el mes actual (ese no está "cerrado" todavía), del más
// reciente al más antiguo.
export function getClosedMonths({ expenses = [], fundings = [], transfers = [], contributions = [], debts = [] }, currentMonthKey) {
  const keys = new Set();
  for (const e of expenses) keys.add(e.fecha.slice(0, 7));
  for (const f of fundings) keys.add(f.fecha.slice(0, 7));
  for (const t of transfers) keys.add(t.fecha.slice(0, 7));
  for (const c of contributions) keys.add(c.fecha.slice(0, 7));
  for (const d of debts) keys.add(d.fecha.slice(0, 7));
  keys.delete(currentMonthKey);
  return Array.from(keys).sort().reverse();
}

export function buildMonthlySummary({ monthKey, expenses = [], fundings = [], transfers = [], contributions = [], goals = [], debts = [], categories = [] }) {
  // Lo que las deudas movieron de cada categoría (con categoría elegida).
  const movimientosDeuda = movimientosDeDeudas(debts);
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

  // Compras hechas con metas de ahorro cerradas ese mes. Van aparte: NO suman a
  // "gastado", porque esa plata ya salió del saldo cuando se aportó a la meta.
  const comprasDelMes = (key) =>
    goals
      .filter((g) => g.completed_at)
      .map((g) => ({
        nombre: g.used_for || g.nombre,
        fecha: g.used_at || fechaLocalISO(new Date(g.completed_at)),
        monto: contributions.filter((c) => c.goal_id === g.id).reduce((sum, c) => sum + Number(c.monto), 0),
      }))
      .filter((c) => c.fecha.slice(0, 7) === key && c.monto > 0);
  const comprasConAhorro = comprasDelMes(monthKey);
  const totalComprasConAhorro = comprasConAhorro.reduce((sum, c) => sum + c.monto, 0);
  const totalComprasAnterior = comprasDelMes(mesAnteriorKey).reduce((sum, c) => sum + c.monto, 0);

  // Comparación con el mes anterior (el resumen solo existe al cerrar el mes, así que
  // ambos meses están completos). Las compras con ahorro cuentan como gasto.
  const gastoCategoriaAnterior = {};
  for (const e of expenses) {
    if (!e.category_id || e.fecha.slice(0, 7) !== mesAnteriorKey) continue;
    gastoCategoriaAnterior[e.category_id] = (gastoCategoriaAnterior[e.category_id] || 0) + Number(e.monto);
  }
  const porCategoria = categories
    .map((cat) => {
      const actual = gastoPorCategoria[cat.id] || 0;
      const anterior = gastoCategoriaAnterior[cat.id] || 0;
      return { categoria: cat, actual, anterior, delta: actual - anterior };
    })
    .filter((r) => r.actual > 0 || r.anterior > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const totalConCompras = totalGastado + totalComprasConAhorro;
  const totalAnteriorConCompras = totalMesAnterior + totalComprasAnterior;
  const comparacion = {
    hayMesAnterior: totalAnteriorConCompras > 0,
    mesAnteriorKey,
    totalActual: totalConCompras,
    totalAnterior: totalAnteriorConCompras,
    cambioPct: totalAnteriorConCompras > 0
      ? Math.round(((totalConCompras - totalAnteriorConCompras) / totalAnteriorConCompras) * 100)
      : null,
    comprasActual: totalComprasConAhorro,
    comprasAnterior: totalComprasAnterior,
    porCategoria,
  };

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

  // Lo que se mandó a metas de ahorro hasta el corte, por categoría de origen.
  const ahorradoPorCategoria = {};
  for (const c of contributions) {
    if (!c.source_category_id || !hastaElCorte(c.fecha)) continue;
    ahorradoPorCategoria[c.source_category_id] = (ahorradoPorCategoria[c.source_category_id] || 0) + Number(c.monto);
  }

  const deudaPorCategoria = {};
  for (const m of movimientosDeuda) {
    if (!m.fecha || !hastaElCorte(m.fecha)) continue;
    deudaPorCategoria[m.category_id] = (deudaPorCategoria[m.category_id] || 0) + m.monto;
  }

  let balanceAlCierre = 0;
  for (const cat of categories) {
    const aportes = aportesPorCategoria[cat.id] || 0;
    const neto = netoTransferenciasPorCategoria[cat.id] || 0;
    const gastado = gastadoParaSaldoPorCategoria[cat.id] || 0;
    balanceAlCierre += aportes + neto - gastado - (ahorradoPorCategoria[cat.id] || 0) + (deudaPorCategoria[cat.id] || 0);
  }

  // Deudas/préstamos que seguían activos (sin saldar) al cierre de ESE
  // mes: ya existían para entonces, y si se pagaron, fue después del
  // cierre (si se pagaron antes, ya no estaban activas en ese momento).
  const deudasActivasAlCierre = debts.filter((d) => {
    if (d.fecha > corte) return false;
    if (!d.pagado) return true;
    return Boolean(d.fecha_pago && d.fecha_pago > corte);
  });
  const totalTeDebenAlCierre = deudasActivasAlCierre
    .filter((d) => d.tipo === 'prestado')
    .reduce((sum, d) => sum + Number(d.monto), 0);
  const totalDebesAlCierre = deudasActivasAlCierre
    .filter((d) => d.tipo === 'debo')
    .reduce((sum, d) => sum + Number(d.monto), 0);

  return {
    monthKey,
    totalGastado,
    cambioPct,
    categoriaTop,
    categoriaTopMonto,
    ahorroLogrado,
    comprasConAhorro,
    totalComprasConAhorro,
    comparacion,
    balanceAlCierre,
    totalTeDebenAlCierre,
    totalDebesAlCierre,
  };
}

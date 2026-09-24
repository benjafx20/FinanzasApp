// Arma un resumen compacto (no todos los datos crudos) para mandarle al
// asistente. Un resumen chico es mas rapido, mas barato, y mas facil de
// que el modelo lo lea bien que un volcado gigante de filas de la base
// de datos.

const MAX_GASTOS_RECIENTES = 60;

function nombreCategoria(expense, categoriasPorId) {
  return expense.categories?.nombre || categoriasPorId[expense.category_id]?.nombre || 'Sin categoria';
}

export function buildFinancialContext({
  expenses,
  incomes,
  categories,
  saldoPorCategoria,
  asignadoPorCategoria,
  debts,
  goals,
  totalByGoal,
  balanceTotal,
  monthKey,
}) {
  const categoriasPorId = Object.fromEntries(categories.map((c) => [c.id, c]));

  const categoriasResumen = categories.map((c) => ({
    nombre: c.nombre,
    saldo: Math.round(saldoPorCategoria[c.id] || 0),
    asignado: Math.round(asignadoPorCategoria[c.id] || 0),
  }));

  const gastoMesPorCategoria = {};
  for (const e of expenses) {
    if (e.fecha.slice(0, 7) !== monthKey) continue;
    const nombre = nombreCategoria(e, categoriasPorId);
    gastoMesPorCategoria[nombre] = (gastoMesPorCategoria[nombre] || 0) + Number(e.monto);
  }

  const gastosRecientes = expenses
    .slice(0, MAX_GASTOS_RECIENTES)
    .map((e) => ({
      fecha: e.fecha,
      monto: Number(e.monto),
      categoria: nombreCategoria(e, categoriasPorId),
      nota: e.nota || null,
    }));

  const deudasActivas = debts
    .filter((d) => !d.pagado)
    .map((d) => ({ persona: d.persona, tipo: d.tipo, monto: Number(d.monto) }));

  const metasDeAhorro = goals.map((g) => ({
    nombre: g.nombre,
    objetivo: Number(g.monto_objetivo),
    acumulado: totalByGoal(g.id),
  }));

  const ingresosRecientes = incomes
    .slice(0, 20)
    .map((i) => ({ fecha: i.fecha, monto: Number(i.monto), nota: i.nota || null }));

  return {
    fechaHoy: new Date().toISOString().slice(0, 10),
    balanceTotal: Math.round(balanceTotal),
    categorias: categoriasResumen,
    gastoDelMesActualPorCategoria: gastoMesPorCategoria,
    gastosRecientes,
    ingresosRecientes,
    deudasActivas,
    metasDeAhorro,
  };
}

// Cálculos del presupuesto semanal. Las fechas se manejan como texto
// 'YYYY-MM-DD' (igual que `fecha` en gastos) para no tener problemas de zona horaria.
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// 1 = lunes ... 7 = domingo
const isoDow = (s) => {
  const d = parse(s).getDay();
  return d === 0 ? 7 : d;
};

// Día en que parte el presupuesto: hoy ("esta") o el próximo lunes ("lunes").
export function fechaInicioPlan(modo, hoy = toISO(new Date())) {
  if (modo === 'esta') return hoy;
  const dow = isoDow(hoy);
  return dow === 1 ? hoy : addDays(hoy, 8 - dow);
}

// La semana 1 termina el primer domingo desde el inicio; las demás son lunes a domingo.
export function rangoSemana(inicio, k) {
  const fin = addDays(addDays(inicio, 7 - isoDow(inicio)), 7 * (k - 1));
  const ini = k === 1 ? inicio : addDays(fin, -6);
  return { ini, fin };
}

const gastoEnRango = (expenses, categoryId, ini, fin) =>
  expenses
    .filter((e) => e.category_id === categoryId && e.fecha >= ini && e.fecha <= fin)
    .reduce((sum, e) => sum + Number(e.monto), 0);

// Plata que entra a la categoría durante la semana (aportes, ingresos repartidos
// o traspasos que le llegan): suma al presupuesto de esa semana.
const aportesEnRango = (aportes, categoryId, ini, fin) =>
  aportes
    .filter((a) => a.category_id === categoryId && a.fecha >= ini && a.fecha <= fin)
    .reduce((sum, a) => sum + Number(a.monto), 0);

// Estado de un plan hoy. `closures` = cierres de ESE plan. Para semanas ya
// cerradas se usa lo que guardó el proceso automático; si todavía no corrió
// (ej. lunes muy temprano) se calcula igual con los gastos.
export function calcularPlan(plan, closures, expenses, aportes = [], hoy = toISO(new Date())) {
  if (hoy < plan.fecha_inicio) return { estado: 'pendiente', inicio: plan.fecha_inicio };

  let k = 1;
  while (k <= plan.semanas && rangoSemana(plan.fecha_inicio, k).fin < hoy) k += 1;
  if (k > plan.semanas) return { estado: 'terminado' };

  const monto = Number(plan.monto_semanal);
  const cierres = new Map(closures.map((c) => [c.semana_num, c]));
  let deuda = Number(cierres.get(0)?.deuda_arrastrada || 0);
  for (let i = 1; i < k; i += 1) {
    const c = cierres.get(i);
    if (c) {
      deuda = Number(c.deuda_arrastrada);
    } else {
      const { ini, fin } = rangoSemana(plan.fecha_inicio, i);
      const extra = aportesEnRango(aportes, plan.category_id, ini, fin);
      deuda = Math.max(0, gastoEnRango(expenses, plan.category_id, ini, fin) + deuda - monto - extra);
    }
  }

  const { ini, fin } = rangoSemana(plan.fecha_inicio, k);
  const gastado = gastoEnRango(expenses, plan.category_id, ini, fin);
  const extra = aportesEnRango(aportes, plan.category_id, ini, fin);
  return {
    estado: 'activo',
    semanaActual: k,
    totalSemanas: plan.semanas,
    monto,
    deuda,
    gastado,
    aportes: extra,
    disponible: monto + extra - deuda - gastado,
    ini,
    fin,
  };
}

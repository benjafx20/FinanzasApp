import { rangoSemana, addDays, toISO } from './weeklyPlan';

// Semanas de presupuesto semanal que se cerraron en los últimos 6 días (es
// decir, desde el lunes pasado hasta el sábado siguiente), para mostrar el
// resumen. Cada elemento: { plan, cierre, fin }.
export function resumenSemanaPasada(plans, closures, hoy = toISO(new Date())) {
  const desde = addDays(hoy, -6);
  const items = [];
  for (const plan of plans) {
    if (plan.estado === 'apagado') continue;
    for (const cierre of closures) {
      if (cierre.plan_id !== plan.id || cierre.semana_num < 1) continue;
      const { fin } = rangoSemana(plan.fecha_inicio, cierre.semana_num);
      if (fin < hoy && fin >= desde) items.push({ plan, cierre, fin });
    }
  }
  return items;
}

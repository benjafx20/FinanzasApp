import { formatCurrency } from './formatCurrency';

// Decide qué decirle al usuario antes de eliminar una categoría, según todo lo
// que se pierde con ella. `usage` viene de checkCategoryUsage + el saldo actual.
// Devuelve { bloquear, mensaje }: si bloquear es true, no se debe eliminar.
export function evaluarBorradoCategoria(cat, usage) {
  const saldo = Number(usage.saldo) || 0;
  if (Math.abs(saldo) >= 1) {
    return {
      bloquear: true,
      mensaje:
        `"${cat.nombre}" tiene ${formatCurrency(saldo)} de saldo y, si la eliminas, esa plata desaparece de tu balance.\n\n` +
        'Antes muévela a otra categoría con "Mover plata" (o gástala) y vuelve a intentarlo. Si solo quieres dejar de verla, puedes ocultarla.',
    };
  }
  const items = [];
  if (usage.gastos) items.push(`${usage.gastos} gasto(s), que quedarán sin categoría`);
  if (usage.recurrentes) items.push(`${usage.recurrentes} gasto(s) recurrente(s), que quedarán sin categoría`);
  if (usage.aportes) items.push(`${usage.aportes} aporte(s) de plata, que se borrarán`);
  if (usage.traspasos) items.push(`${usage.traspasos} movimiento(s) entre categorías, que perderán este extremo`);
  if (usage.planes) items.push(`${usage.planes} presupuesto(s) semanal(es), que se borrarán`);
  if (usage.ahorros) items.push(`${usage.ahorros} aporte(s) a metas de ahorro, que perderán su origen`);
  if (usage.deudas) items.push(`${usage.deudas} deuda(s), que perderán su categoría`);
  if (items.length === 0) return { bloquear: false, mensaje: `¿Eliminar la categoría "${cat.nombre}"?` };
  return {
    bloquear: false,
    mensaje: `Al eliminar "${cat.nombre}" pasará esto:\n\n• ${items.join('\n• ')}\n\nEl saldo de la categoría está en $0. ¿Quieres continuar?`,
  };
}

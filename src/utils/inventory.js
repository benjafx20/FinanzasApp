import { hoyISO } from './dates';

export const UMBRAL_DIAS_INVENTARIO = 15;

const clave = (texto) => String(texto).trim().toLowerCase();
const diasEntre = (a, b) =>
  Math.max(0, Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000));

// Equipos (grupos "agrupar como") de una categoría de inventario que ya se
// compraron pero todavía no tienen ninguna venta (aporte con el mismo grupo).
// Un grupo = un equipo. Los días cuentan desde su primer gasto.
export function equiposSinVender({ categoryId, expenses, fundings, hoy = hoyISO(), umbral = UMBRAL_DIAS_INVENTARIO }) {
  const vendidos = new Set(fundings.filter((f) => f.category_id === categoryId && f.etiqueta).map((f) => clave(f.etiqueta)));
  const equipos = new Map();
  for (const e of expenses) {
    if (e.category_id !== categoryId || !e.etiqueta) continue;
    const k = clave(e.etiqueta);
    if (vendidos.has(k)) continue;
    const equipo = equipos.get(k) || { nombre: e.etiqueta.trim(), costo: 0, primeraCompra: e.fecha };
    equipo.costo += Number(e.monto);
    if (e.fecha < equipo.primeraCompra) equipo.primeraCompra = e.fecha;
    equipos.set(k, equipo);
  }
  return [...equipos.values()]
    .map((eq) => {
      const dias = diasEntre(eq.primeraCompra, hoy);
      return { ...eq, dias, atrasado: dias >= umbral };
    })
    .sort((a, b) => b.dias - a.dias);
}

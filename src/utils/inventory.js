import { hoyISO } from './dates';

export const UMBRAL_DIAS_INVENTARIO = 15;

const clave = (texto) => String(texto).trim().toLowerCase();
export const claveEquipo = clave;
// Clave del estado de un equipo ("repuesto" o "perdida"): categoría + nombre normalizado.
export const estadoKey = (categoryId, nombre) => `${categoryId}|${clave(nombre)}`;
const diasEntre = (a, b) =>
  Math.max(0, Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000));

// Equipos (grupos "agrupar como") de una categoría de inventario que ya se
// compraron pero todavía no tienen ninguna venta (aporte con el mismo grupo).
// Un grupo = un equipo. Los días cuentan desde su primer gasto.
// `estados`: { [estadoKey]: 'repuesto' | 'perdida' } para los equipos que ya no se van a
// vender (quedan solo para repuestos o se dieron por pérdida). Cada equipo trae su
// `estado` (o null); usa pendientes() y descartados() para separarlos.
export function equiposSinVender({ categoryId, expenses, fundings, hoy = hoyISO(), umbral = UMBRAL_DIAS_INVENTARIO, estados = {} }) {
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
      return { ...eq, dias, atrasado: dias >= umbral, estado: estados[estadoKey(categoryId, eq.nombre)] || null };
    })
    .sort((a, b) => b.dias - a.dias);
}

// Equipos que de verdad esperan una venta.
export const pendientes = (equipos) => equipos.filter((e) => !e.estado);
// Equipos que no se van a vender: solo repuestos o dados por pérdida.
export const descartados = (equipos) => equipos.filter((e) => e.estado);

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const nombre = MESES[m - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

// Devuelve un arreglo de frases (no un solo párrafo largo) para que se
// puedan mostrar como líneas cortas, más fáciles de leer de un vistazo.
export function generarResumenConversado(stats, formatCurrency) {
  const frases = [];
  const mesNombre = MESES[Number(stats.monthKey.split('-')[1]) - 1];

  frases.push(`Cerraste ${mesNombre} habiendo gastado ${formatCurrency(stats.totalGastado)} en total.`);

  if (stats.cambioPct !== null) {
    const pct = Math.abs(stats.cambioPct);
    if (stats.cambioPct <= -20) {
      frases.push(`¡Bien ahí! Gastaste ${pct}% menos que el mes anterior — se nota el esfuerzo. 🎉`);
    } else if (stats.cambioPct <= -5) {
      frases.push(`Gastaste ${pct}% menos que el mes anterior. Vas por buen camino.`);
    } else if (stats.cambioPct < 5) {
      frases.push(`Te mantuviste bastante parejo respecto al mes anterior.`);
    } else if (stats.cambioPct < 20) {
      frases.push(`Gastaste un poco más que el mes pasado (${pct}% más). Nada grave, pero ojo.`);
    } else {
      frases.push(`Ojo — este mes se te fue ${pct}% más que el anterior. Vale la pena revisar en qué.`);
    }
  }

  if (stats.categoriaTop) {
    frases.push(`Tu categoría más movida fue ${stats.categoriaTop.nombre}, con ${formatCurrency(stats.categoriaTopMonto)}.`);
  }

  if (stats.ahorroLogrado > 0) {
    frases.push(`Y alcanzaste a guardar ${formatCurrency(stats.ahorroLogrado)} en tus metas de ahorro. ¡Eso suma! 💪`);
  }

  const balanceFrase = stats.balanceAlCierre >= 0
    ? `Terminaste el mes con ${formatCurrency(stats.balanceAlCierre)} de balance total.`
    : `Terminaste el mes en rojo: ${formatCurrency(stats.balanceAlCierre)} de balance total.`;
  frases.push(balanceFrase);

  return frases;
}

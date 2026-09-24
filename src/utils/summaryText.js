const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const nombre = MESES[m - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

// Cada frase es un arreglo de "partes": texto plano (string) o un monto
// ({ monto: number }). Así el que las muestra puede reemplazar cada monto
// por un componente <Amount> (que respeta el modo lectura) en vez de que
// el número quede incrustado en un string plano e imposible de ocultar.
function monto(valor) {
  return { monto: valor };
}

export function generarResumenConversado(stats) {
  const frases = [];
  const mesNombre = MESES[Number(stats.monthKey.split('-')[1]) - 1];

  frases.push(['Cerraste ', mesNombre, ' habiendo gastado ', monto(stats.totalGastado), ' en total.']);

  if (stats.cambioPct !== null) {
    const pct = Math.abs(stats.cambioPct);
    if (stats.cambioPct <= -20) {
      frases.push([`¡Bien ahí! Gastaste ${pct}% menos que el mes anterior — se nota el esfuerzo. 🎉`]);
    } else if (stats.cambioPct <= -5) {
      frases.push([`Gastaste ${pct}% menos que el mes anterior. Vas por buen camino.`]);
    } else if (stats.cambioPct < 5) {
      frases.push(['Te mantuviste bastante parejo respecto al mes anterior.']);
    } else if (stats.cambioPct < 20) {
      frases.push([`Gastaste un poco más que el mes pasado (${pct}% más). Nada grave, pero ojo.`]);
    } else {
      frases.push([`Ojo — este mes se te fue ${pct}% más que el anterior. Vale la pena revisar en qué.`]);
    }
  }

  if (stats.categoriaTop) {
    frases.push(['Tu categoría más movida fue ', stats.categoriaTop.nombre, ', con ', monto(stats.categoriaTopMonto), '.']);
  }

  if (stats.ahorroLogrado > 0) {
    frases.push(['Y alcanzaste a guardar ', monto(stats.ahorroLogrado), ' en tus metas de ahorro. ¡Eso suma! 💪']);
  }

  if (stats.totalTeDebenAlCierre > 0 && stats.totalDebesAlCierre > 0) {
    frases.push(['En ese momento te debían ', monto(stats.totalTeDebenAlCierre), ' y tú debías ', monto(stats.totalDebesAlCierre), '.']);
  } else if (stats.totalTeDebenAlCierre > 0) {
    frases.push(['Y te seguían debiendo ', monto(stats.totalTeDebenAlCierre), ' en préstamos pendientes.']);
  } else if (stats.totalDebesAlCierre > 0) {
    frases.push(['Ojo que en ese momento tú debías ', monto(stats.totalDebesAlCierre), '.']);
  }

  const prefijoBalance = stats.balanceAlCierre >= 0
    ? 'Terminaste el mes con '
    : 'Terminaste el mes en rojo: ';
  frases.push([prefijoBalance, monto(stats.balanceAlCierre), ' de balance total.']);

  return frases;
}

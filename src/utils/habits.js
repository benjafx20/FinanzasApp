// Aprende qué categoría usas para cada comercio (la "nota" del gasto): la clave
// es el nombre normalizado, así "Copec", "COPEC " y "cópec" son lo mismo.
export function normalizarComercio(texto) {
  if (!texto) return '';
  const limpio = String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  // Notas muy largas ("almuerzo con el equipo del proyecto...") no son un comercio.
  if (limpio.length < 2 || limpio.length > 40) return '';
  return limpio;
}

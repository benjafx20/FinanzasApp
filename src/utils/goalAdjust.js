// Cambiar a mano "cuánto llevo ahorrado" en una meta. Lo ahorrado es la suma de sus
// aportes, así que el cambio se traduce en operaciones sobre los aportes:
//   - si sube: se agrega un aporte por la diferencia;
//   - si baja: se deshacen los aportes más recientes hasta llegar al nuevo total
//     (la plata vuelve a la categoría de donde salió cada uno).
export function planearAjusteAhorro({ aportes, nuevoTotal }) {
  const actual = aportes.reduce((s, a) => s + Number(a.monto), 0);
  const diff = Math.round(Number(nuevoTotal) || 0) - actual;
  if (diff === 0) return { diff: 0, operaciones: [] };
  if (diff > 0) return { diff, operaciones: [{ tipo: 'agregar', monto: diff }] };

  let resto = -diff;
  const operaciones = [];
  const masRecientesPrimero = [...aportes].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || String(b.created_at || '').localeCompare(String(a.created_at || ''))
  );
  for (const aporte of masRecientesPrimero) {
    if (resto <= 0) break;
    const monto = Number(aporte.monto);
    if (monto <= resto) {
      operaciones.push({ tipo: 'borrar', id: aporte.id, monto });
      resto -= monto;
    } else {
      operaciones.push({ tipo: 'reducir', id: aporte.id, monto: monto - resto });
      resto = 0;
    }
  }
  return { diff, operaciones };
}

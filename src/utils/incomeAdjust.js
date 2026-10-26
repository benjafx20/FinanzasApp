// Al cambiar el monto de un ingreso que ya estaba repartido en categorías, el
// reparto se ajusta en la misma proporción. Devuelve qué cambia en cada aporte y
// las categorías que quedarían en negativo. Lanza un error si algún aporte
// quedaría en cero.
export function calcularAjusteReparto({ aportes, montoViejo, montoNuevo, categorias, saldoPorCategoria }) {
  const nombre = (id) => categorias.find((c) => c.id === id)?.nombre || 'Categoría';
  const ratio = Number(montoNuevo) / Number(montoViejo);
  const totalNuevo = Math.round(aportes.reduce((s, f) => s + Number(f.monto), 0) * ratio);

  // El último aporte absorbe el redondeo, para que la suma sea exacta.
  let acumulado = 0;
  const cambios = aportes.map((f, i) => {
    const nuevo = i === aportes.length - 1 ? totalNuevo - acumulado : Math.round(Number(f.monto) * ratio);
    acumulado += nuevo;
    return { funding: f, nuevo, categoria: nombre(f.category_id) };
  });
  if (cambios.some((c) => c.nuevo <= 0)) {
    throw new Error('Con ese monto, alguna categoría del reparto quedaría en cero. Edita el reparto a mano.');
  }

  const delta = {};
  for (const c of cambios) {
    delta[c.funding.category_id] = (delta[c.funding.category_id] || 0) + c.nuevo - Number(c.funding.monto);
  }
  const advertencias = Object.entries(delta)
    .filter(([catId, d]) => (saldoPorCategoria[catId] || 0) + d < 0)
    .map(([catId, d]) => ({ categoria: nombre(catId), saldoDespues: (saldoPorCategoria[catId] || 0) + d }));

  return { cambios, advertencias };
}

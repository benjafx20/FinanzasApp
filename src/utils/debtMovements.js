// Movimientos de plata que generan las deudas, solo cuando se eligió una
// categoría (si no, la deuda es solo un registro y no mueve nada).
//   - "Le presté": la plata sale de la categoría elegida el día del préstamo; si
//     después te pagan, entra a la categoría elegida el día del pago.
//   - "Le debo": la plata sale de la categoría elegida el día que se paga.
// monto positivo = entra a la categoría, negativo = sale.
export function movimientosDeDeudas(debts) {
  const movimientos = [];
  for (const d of debts) {
    const monto = Number(d.monto);
    if (d.tipo === 'prestado') {
      if (d.source_category_id) movimientos.push({ category_id: d.source_category_id, monto: -monto, fecha: d.fecha });
      if (d.pagado && d.destination_category_id) {
        movimientos.push({ category_id: d.destination_category_id, monto, fecha: d.fecha_pago });
      }
    } else if (d.pagado && d.source_category_id) {
      movimientos.push({ category_id: d.source_category_id, monto: -monto, fecha: d.fecha_pago });
    }
  }
  return movimientos;
}

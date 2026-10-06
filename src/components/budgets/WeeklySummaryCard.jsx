import { formatCurrency } from '../../utils/formatCurrency';
import './WeeklySummaryCard.css';

// Resumen de la semana que terminó el domingo: cuánto se gastó en cada
// categoría con presupuesto semanal, qué sobró y adónde se movió, y si alguna
// quedó en deuda.
export function WeeklySummaryCard({ items, categorias, onDismiss }) {
  const nombre = (id) => categorias.find((c) => c.id === id)?.nombre;

  return (
    <section className="weekly-summary">
      <strong className="weekly-summary__title">Resumen de tu semana</strong>
      <ul className="weekly-summary__list">
        {items.map(({ plan, cierre }) => {
          const gastado = Number(cierre.gastado);
          const sobrante = Number(cierre.sobrante_movido);
          const deuda = Number(cierre.deuda_arrastrada);
          const destino = nombre(plan.sobrante_category_id);
          return (
            <li key={cierre.id}>
              <b>{nombre(plan.category_id) || 'Categoría'}</b>: gastaste {formatCurrency(gastado)} de{' '}
              {formatCurrency(Number(plan.monto_semanal))}.{' '}
              {deuda > 0
                ? `Te pasaste por ${formatCurrency(deuda)}; se descuenta de esta semana.`
                : sobrante > 0
                  ? `Sobraron ${formatCurrency(sobrante)}${destino ? ` y se movieron a ${destino}` : ''}.`
                  : ''}
            </li>
          );
        })}
      </ul>
      <button type="button" className="weekly-summary__btn" onClick={onDismiss}>Entendido</button>
    </section>
  );
}

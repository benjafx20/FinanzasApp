import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import './BudgetCard.css';

// `asignado`: total que le has metido a esta categoría (ingresos repartidos
// + "Agregar plata" + traspasos entrantes/salientes) — es tu presupuesto
// real para ella. `saldo`: lo que te queda de eso (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
export function BudgetCard({
  category,
  asignado,
  saldo,
  gastadoSemana,
  gastadoMes,
  onOpenDetail,
}) {
  const saldoNegativo = saldo < 0;
  const saldoBajo = !saldoNegativo && asignado > 0 && saldo <= asignado * 0.2;
  const estado = saldoNegativo ? 'budget-card--negativo' : saldoBajo ? 'budget-card--bajo' : '';

  return (
    <div
      role="button"
      tabIndex={0}
      className={`budget-card ${estado}`}
      style={{ '--card-color': category.color }}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail?.();
        }
      }}
      aria-label={`Ver historial de ${category.nombre}`}
    >
      <div className="budget-card__top">
        <span className="budget-card__icon-circle">
          <CategoryIcon name={category.icono} size={16} />
        </span>
        <span className="budget-card__nombre">{category.nombre}</span>
        {(saldoBajo || saldoNegativo) && <span className="budget-card__aviso">⚠</span>}
      </div>

      <div className="budget-card__summary">
        <span className="budget-card__saldo-label">Disponible</span>
        <span className="budget-card__saldo"><Amount value={saldo} /></span>
      </div>

      <div className="budget-card__stats">
        <div><span>Total</span><b><Amount value={asignado} /></b></div>
        <div><span>Semana</span><b><Amount value={gastadoSemana} /></b></div>
        <div><span>Mes</span><b><Amount value={gastadoMes} /></b></div>
      </div>
    </div>
  );
}

import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import './BudgetCard.css';

// `asignado`: total que le has metido a esta categoría (ingresos repartidos
// + "Agregar plata" + traspasos entrantes/salientes) — es tu presupuesto
// real para ella. `saldo`: lo que te queda de eso (asignado - gastado).
export function BudgetCard({
  category,
  asignado,
  saldo,
  semana,
  onOpenDetail,
}) {
  // `semana`: presupuesto semanal activo de la categoría (ver utils/weeklyPlan).
  // Con presupuesto activo, lo grande es lo que te queda ESTA SEMANA y el saldo
  // real pasa a ser un dato más chico.
  const conPlan = semana?.estado === 'activo';
  const semanaNegativa = conPlan && semana.disponible < 0;
  const semanaBaja = conPlan && !semanaNegativa && semana.disponible <= semana.monto * 0.2;
  const saldoNegativo = saldo < 0;
  const saldoBajo = !saldoNegativo && asignado > 0 && saldo <= asignado * 0.2;
  const estado =
    saldoNegativo || semanaNegativa
      ? 'budget-card--negativo'
      : saldoBajo || semanaBaja
        ? 'budget-card--bajo'
        : '';

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
        {(saldoBajo || saldoNegativo || semanaBaja || semanaNegativa) && <span className="budget-card__aviso">⚠</span>}
      </div>

      <div className="budget-card__summary">
        <span className="budget-card__saldo-label">{conPlan ? 'Disponible esta semana' : 'Disponible'}</span>
        <span className="budget-card__saldo"><Amount value={conPlan ? semana.disponible : saldo} /></span>
      </div>

      {conPlan && (
        <div className="budget-card__stats">
          <div><span>Saldo total</span><b><Amount value={saldo} /></b></div>
        </div>
      )}
    </div>
  );
}

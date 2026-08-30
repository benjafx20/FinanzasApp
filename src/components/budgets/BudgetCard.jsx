import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import './BudgetCard.css';

// `asignado`: total que le has metido a esta categoría (ingresos repartidos
// + "Agregar plata" + traspasos entrantes/salientes) — es tu presupuesto
// real para ella. `saldo`: lo que te queda de eso (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
export function BudgetCard({ category, asignado, saldo, gastadoSemana, gastadoMes, onEdit }) {
  const saldoNegativo = saldo < 0;

  return (
    <button className="budget-card" onClick={onEdit}>
      <div className="budget-card__top">
        <div className="budget-card__icon" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.icono} size={16} />
        </div>
        <span className="budget-card__nombre">{category.nombre}</span>
      </div>

      <span className={`budget-card__saldo ${saldoNegativo ? 'budget-card__saldo--negativo' : ''}`}>
        {formatCurrency(saldo)}
      </span>
      <span className="budget-card__saldo-label">te queda</span>

      <div className="budget-card__stats">
        <span>Asignado: {formatCurrency(asignado)}</span>
        <span>Semana: {formatCurrency(gastadoSemana)}</span>
        <span>Mes: {formatCurrency(gastadoMes)}</span>
      </div>
    </button>
  );
}

import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import './BudgetCard.css';

// `asignado`: total que le has metido a esta categoría (ingresos repartidos
// + "Agregar plata" + traspasos entrantes/salientes) — es tu presupuesto
// real para ella. `saldo`: lo que te queda de eso (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
export function BudgetCard({ category, asignado, saldo, gastadoSemana, gastadoMes, onEdit }) {
  const saldoNegativo = saldo < 0;
  // Avisa cuando queda 20% o menos del total asignado (y no está ya en rojo).
  const saldoBajo = !saldoNegativo && asignado > 0 && saldo <= asignado * 0.2;

  return (
    <button
      className={`budget-card ${saldoBajo ? 'budget-card--bajo' : ''}`}
      onClick={onEdit}
    >
      <div className="budget-card__top">
        <div className="budget-card__icon" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.icono} size={16} />
        </div>
        <span className="budget-card__nombre">{category.nombre}</span>
        {saldoBajo && (
          <span className="budget-card__aviso" title="Queda poco saldo en esta categoría">
            ⚠
          </span>
        )}
      </div>

      <span
        className={`budget-card__saldo ${saldoNegativo ? 'budget-card__saldo--negativo' : ''} ${saldoBajo ? 'budget-card__saldo--bajo' : ''}`}
      >
        <Amount value={saldo} />
      </span>
      <span className="budget-card__saldo-label">te queda</span>

      <div className="budget-card__stats">
        <span>Asignado: <Amount value={asignado} /></span>
        <span>Semana: <Amount value={gastadoSemana} /></span>
        <span>Mes: <Amount value={gastadoMes} /></span>
      </div>
    </button>
  );
}

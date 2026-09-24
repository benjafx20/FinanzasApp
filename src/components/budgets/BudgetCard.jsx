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
  const estado = saldoNegativo ? 'budget-card--negativo' : saldoBajo ? 'budget-card--bajo' : '';

  return (
    <button
      className={`budget-card ${estado}`}
      onClick={onEdit}
      style={{ '--card-color': category.color }}
    >
      <CategoryIcon name={category.icono} size={72} className="budget-card__marca" />

      <div className="budget-card__top">
        <span className="budget-card__nombre"><CategoryIcon name={category.icono} size={13} /> {category.nombre}</span>
        {(saldoBajo || saldoNegativo) && <span className="budget-card__aviso">⚠</span>}
      </div>

      <span className="budget-card__saldo-label">te queda</span>
      <span className="budget-card__saldo"><Amount value={saldo} /></span>

      <div className="budget-card__stats">
        <div><span>Asignado</span><b><Amount value={asignado} /></b></div>
        <div><span>Semana</span><b><Amount value={gastadoSemana} /></b></div>
        <div><span>Mes</span><b><Amount value={gastadoMes} /></b></div>
      </div>
    </button>
  );
}

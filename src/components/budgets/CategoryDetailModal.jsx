import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import { ExpenseCard } from '../expenses/ExpenseCard';
import { FundingHistory } from './FundingHistory';
import './CategoryDetailModal.css';

// `asignado`: total que le has metido a esta categoría (tu presupuesto real
// para ella). `saldo`: lo que te queda (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
export function CategoryDetailModal({
  category,
  asignado,
  saldo,
  gastadoSemana,
  gastadoMes,
  fundingsDeCategoria,
  onUndoFunding,
  expensesDeCategoria,
  onAddExpense,
  onAddFunds,
  onOpenTransfer,
  onEditCategory,
  onDeleteCategory,
  onEditExpense,
  onDeleteExpense,
}) {
  const saldoNegativo = saldo < 0;

  return (
    <div className="category-detail">
      <div className="category-detail__header">
        <span className="category-detail__icon" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.icono} size={22} />
        </span>
        <div>
          <span className="category-detail__nombre">{category.nombre}</span>
          {!category.user_id && <span className="category-detail__badge">predefinida</span>}
        </div>
      </div>

      <span className={`category-detail__saldo ${saldoNegativo ? 'category-detail__saldo--negativo' : ''}`}>
        {formatCurrency(saldo)}
      </span>
      <span className="category-detail__saldo-label">te queda</span>

      <div className="category-detail__stats">
        <span>Asignado en total: <strong>{formatCurrency(asignado)}</strong></span>
        <span>Gastado esta semana: <strong>{formatCurrency(gastadoSemana)}</strong></span>
        <span>Gastado este mes: <strong>{formatCurrency(gastadoMes)}</strong></span>
      </div>

      <div className="category-detail__actions">
        <button type="button" onClick={onAddExpense}>+ Gasto</button>
        <button type="button" onClick={onAddFunds}>+ Agregar plata</button>
        <button type="button" onClick={onOpenTransfer}>Mover plata</button>
      </div>

      <div className="category-detail__fundings">
        <span className="category-detail__expenses-title">Aportes recibidos</span>
        {fundingsDeCategoria.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay aportes en esta categoría.</p>
        ) : (
          <FundingHistory fundings={fundingsDeCategoria} onUndo={onUndoFunding} />
        )}
      </div>

      {category.user_id && (
        <div className="category-detail__manage">
          <button type="button" onClick={onEditCategory}>Editar categoría</button>
          <button type="button" className="category-detail__delete" onClick={onDeleteCategory}>Eliminar</button>
        </div>
      )}

      <div className="category-detail__expenses">
        <span className="category-detail__expenses-title">Gastos de esta categoría</span>
        {expensesDeCategoria.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay gastos en esta categoría.</p>
        ) : (
          <div className="expense-list">
            {expensesDeCategoria.map((exp) => (
              <ExpenseCard key={exp.id} expense={exp} onEdit={onEditExpense} onDelete={onDeleteExpense} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

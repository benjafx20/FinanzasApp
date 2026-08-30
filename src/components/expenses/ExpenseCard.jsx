import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import './ExpenseCard.css';

export function ExpenseCard({ expense, onEdit, onDelete }) {
  const cat = expense.categories;
  const color = cat?.color || '#6B7280';
  const nombre = cat?.nombre || 'Sin categoría';
  const fecha = new Date(expense.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="ticket">
      <button
        className="ticket__main ticket__main--clickable"
        onClick={() => onEdit(expense)}
        aria-label={`Editar gasto de ${nombre}`}
      >
        <div className="ticket__icon" style={{ background: `${color}22`, color }}>
          <CategoryIcon name={cat?.icono} size={18} />
        </div>
        <div className="ticket__info">
          <span className="ticket__category">{nombre}</span>
          {expense.nota && <span className="ticket__nota">{expense.nota}</span>}
        </div>
        <div className="ticket__right">
          <span className="ticket__monto">{formatCurrency(expense.monto)}</span>
          <span className="ticket__fecha">{fecha}</span>
        </div>
      </button>
      <div className="ticket__perforation" aria-hidden="true" />
      <button
        className="ticket__delete"
        onClick={() => onDelete(expense.id)}
        aria-label={`Eliminar gasto de ${nombre}`}
      >
        Eliminar
      </button>
    </div>
  );
}

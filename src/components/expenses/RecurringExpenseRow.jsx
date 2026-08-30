import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import './RecurringExpenseRow.css';

export function RecurringExpenseRow({ recurring, onToggle, onDelete }) {
  const cat = recurring.categories;

  return (
    <div className={`recurring-row ${!recurring.activo ? 'recurring-row--inactivo' : ''}`}>
      <div className="recurring-row__icon" style={{ background: `${cat?.color}22`, color: cat?.color }}>
        <CategoryIcon name={cat?.icono} size={16} />
      </div>
      <div className="recurring-row__info">
        <span className="recurring-row__nombre">{recurring.nombre}</span>
        <span className="recurring-row__detalle">Día {recurring.dia_mes} · {formatCurrency(recurring.monto)}</span>
      </div>
      <label className="recurring-row__switch">
        <input
          type="checkbox"
          checked={recurring.activo}
          onChange={(e) => onToggle(recurring.id, e.target.checked)}
        />
        <span className="recurring-row__slider" />
      </label>
      <button className="recurring-row__delete" onClick={() => onDelete(recurring.id)} aria-label={`Eliminar ${recurring.nombre}`}>
        ✕
      </button>
    </div>
  );
}

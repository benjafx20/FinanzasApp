import { Check, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import './DebtRow.css';

// tipo 'prestado' = te deben (plata que sigue siendo tuya).
// tipo 'debo' = tú debes (plata que no es tuya aunque la tengas).
export function DebtRow({ debt, onMarkPaid, onDelete }) {
  const esPrestamo = debt.tipo === 'prestado';

  return (
    <div className={`debt-row ${debt.pagado ? 'debt-row--pagado' : ''}`}>
      <span className={`debt-row__icon ${esPrestamo ? 'debt-row__icon--prestado' : 'debt-row__icon--debo'}`}>
        {esPrestamo ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </span>

      <div className="debt-row__info">
        <span className="debt-row__persona">{debt.persona}</span>
        {debt.nota && <span className="debt-row__nota">{debt.nota}</span>}
      </div>

      <div className="debt-row__right">
        <span className="debt-row__monto">{formatCurrency(debt.monto)}</span>
        {!debt.pagado && (
          <div className="debt-row__actions">
            <button
              className="debt-row__action"
              onClick={() => onMarkPaid(debt.id)}
              aria-label="Marcar como saldada"
              title="Marcar como saldada"
            >
              <Check size={14} />
            </button>
            <button
              className="debt-row__action debt-row__action--delete"
              onClick={() => onDelete(debt.id)}
              aria-label="Eliminar"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

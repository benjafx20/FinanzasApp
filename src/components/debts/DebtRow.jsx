import { Check, Trash2, Pencil, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Amount } from '../ui/Amount';
import './DebtRow.css';

// tipo 'prestado' = te deben (plata que sigue siendo tuya).
// tipo 'debo' = tú debes (plata que no es tuya aunque la tengas).
export function DebtRow({ debt, onMarkPaid, onEdit, onDelete }) {
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
        <span className="debt-row__monto"><Amount value={debt.monto} /></span>
        <div className="debt-row__actions">
          {!debt.pagado && (
            <button
              className="debt-row__action"
              onClick={() => onMarkPaid(debt)}
              aria-label="Marcar como saldada"
              title="Marcar como saldada"
            >
              <Check size={14} />
            </button>
          )}
          <button className="debt-row__action" onClick={() => onEdit(debt)} aria-label="Editar" title="Editar">
            <Pencil size={14} />
          </button>
          <button
            className="debt-row__action debt-row__action--delete"
            onClick={() => onDelete(debt)}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

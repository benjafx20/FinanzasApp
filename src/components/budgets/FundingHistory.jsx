import { Undo2, Trash2, TrendingUp, Wallet, Pencil } from 'lucide-react';
import { Amount } from '../ui/Amount';
import './FundingHistory.css';

// Un aporte "de ingreso" tiene un ingreso real detrás (income_id): ahí el
// botón elimina ese ingreso completo, igual que en el antiguo apartado de
// Movimientos. Un aporte "manual" (+ Agregar plata) no tiene ingreso que
// borrar, así que solo se puede deshacer el aporte en sí. El lápiz abre el
// editor del aporte (monto, fecha, nota y grupo).
export function FundingHistory({ fundings, onUndo, onDeleteIncome, onEdit }) {
  if (fundings.length === 0) return null;

  return (
    <ul className="funding-history">
      {fundings.map((f) => (
        <li key={f.id} className="funding-history__row">
          <span className="funding-history__icon">
            {f.origen === 'ingreso' ? <TrendingUp size={14} /> : <Wallet size={14} />}
          </span>
          <span className="funding-history__texto">
            {f.origen === 'ingreso' ? 'De un ingreso repartido' : 'Agregado a mano'}
            {f.etiqueta && <strong> · {f.etiqueta}</strong>}
            {f.nota && ` · ${f.nota}`}
          </span>
          <span className="funding-history__monto">+<Amount value={f.monto} /></span>
          {onEdit && (
            <button
              type="button"
              className="funding-history__undo"
              onClick={() => onEdit(f)}
              aria-label="Editar este aporte"
            >
              <Pencil size={14} />
            </button>
          )}
          {f.origen === 'ingreso' && f.income_id ? (
            <button
              type="button"
              className="funding-history__undo funding-history__delete"
              onClick={() => onDeleteIncome(f.income_id)}
              aria-label="Eliminar este ingreso"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="funding-history__undo"
              onClick={() => onUndo(f.id)}
              aria-label="Deshacer este aporte"
            >
              <Undo2 size={14} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

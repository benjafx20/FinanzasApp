import { Undo2, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import './FundingHistory.css';

export function FundingHistory({ fundings, onUndo }) {
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
            {f.nota && ` · ${f.nota}`}
          </span>
          <span className="funding-history__monto">+{formatCurrency(f.monto)}</span>
          <button
            type="button"
            className="funding-history__undo"
            onClick={() => onUndo(f.id)}
            aria-label="Deshacer este aporte"
          >
            <Undo2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

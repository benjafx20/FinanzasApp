import { ArrowRight, Undo2 } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import './TransferHistory.css';

export function TransferHistory({ transfers, onUndo }) {
  if (transfers.length === 0) return null;

  return (
    <ul className="transfer-history">
      {transfers.map((t) => (
        <li key={t.id} className="transfer-history__row">
          <span className="transfer-history__chip" style={{ color: t.origen?.color }}>
            <CategoryIcon name={t.origen?.icono} size={14} />
            {t.origen?.nombre ?? 'Categoría eliminada'}
          </span>
          <ArrowRight size={14} className="transfer-history__arrow" />
          <span className="transfer-history__chip" style={{ color: t.destino?.color }}>
            <CategoryIcon name={t.destino?.icono} size={14} />
            {t.destino?.nombre ?? 'Categoría eliminada'}
          </span>
          <span className="transfer-history__monto"><Amount value={t.monto} /></span>
          <button
            type="button"
            className="transfer-history__undo"
            onClick={() => onUndo(t.id)}
            aria-label="Deshacer movimiento"
          >
            <Undo2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

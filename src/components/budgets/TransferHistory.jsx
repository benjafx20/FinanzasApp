import { useState } from 'react';
import { ArrowRight, Undo2, Pencil } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import { movimientosVisibles } from '../../utils/transfers';
import './TransferHistory.css';

export function TransferHistory({ transfers, onUndo, onEdit }) {
  const [verTodos, setVerTodos] = useState(false);
  if (transfers.length === 0) return null;

  const visibles = movimientosVisibles(transfers, { verTodos });
  const ocultos = transfers.length - visibles.length;
  const fechaCorta = (iso) => (iso ? iso.split('-').reverse().slice(0, 2).join('-') : '');

  return (
    <>
    <ul className="transfer-history">
      {visibles.length === 0 && (
        <li className="dashboard__empty">Solo hay movimientos automáticos del presupuesto semanal.</li>
      )}
      {visibles.map((t) => (
        <li key={t.id} className="transfer-history__row" style={{ flexWrap: 'wrap' }}>
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
          {onEdit && t.from_category_id && t.to_category_id && (
            <button
              type="button"
              className="transfer-history__undo"
              onClick={() => onEdit(t)}
              aria-label="Editar movimiento"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            className="transfer-history__undo"
            onClick={() => onUndo(t.id)}
            aria-label="Deshacer movimiento"
          >
            <Undo2 size={14} />
          </button>
          {(t.nota || t.fecha) && (
            <span style={{ flexBasis: '100%', fontSize: 11, opacity: 0.7 }}>
              {fechaCorta(t.fecha)}
              {t.nota ? ` · ${t.nota}` : ''}
            </span>
          )}
        </li>
      ))}
    </ul>
    {(ocultos > 0 || verTodos) && (
      <button type="button" className="category-detail__show-more" onClick={() => setVerTodos((v) => !v)}>
        {verTodos ? 'Ver menos' : `Ver todos (${transfers.length})`}
      </button>
    )}
    </>
  );
}

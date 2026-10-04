import { useState } from 'react';
import { Undo2, Trash2, TrendingUp, Wallet, Pencil, Check, X } from 'lucide-react';
import { Amount } from '../ui/Amount';
import './FundingHistory.css';

// Un aporte "de ingreso" tiene un ingreso real detrás (income_id): ahí el
// botón elimina ese ingreso completo, igual que en el antiguo apartado de
// Movimientos. Un aporte "manual" (+ Agregar plata) no tiene ingreso que
// borrar, así que solo se puede deshacer el aporte en sí.
export function FundingHistory({ fundings, onUndo, onDeleteIncome, onEditEtiqueta, etiquetasSugeridas = [] }) {
  const [editandoId, setEditandoId] = useState(null);
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (fundings.length === 0) return null;

  const empezarEdicion = (f) => {
    setEditandoId(f.id);
    setValor(f.etiqueta || '');
  };

  const guardar = async (id) => {
    setGuardando(true);
    try {
      await onEditEtiqueta(id, valor);
      setEditandoId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ul className="funding-history">
      {fundings.map((f) => (
        <li key={f.id} className="funding-history__row">
          <span className="funding-history__icon">
            {f.origen === 'ingreso' ? <TrendingUp size={14} /> : <Wallet size={14} />}
          </span>
          {editandoId === f.id ? (
            <>
              <input
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Agrupar como (vacío = sin grupo)"
                maxLength={60}
                list="funding-history-etiquetas"
                autoFocus
                style={{ flex: 1, minWidth: 0, padding: '4px 8px' }}
              />
              <datalist id="funding-history-etiquetas">
                {etiquetasSugeridas.map((et) => (
                  <option key={et} value={et} />
                ))}
              </datalist>
              <button
                type="button"
                className="funding-history__undo"
                onClick={() => guardar(f.id)}
                disabled={guardando}
                aria-label="Guardar grupo"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                className="funding-history__undo"
                onClick={() => setEditandoId(null)}
                aria-label="Cancelar"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <span className="funding-history__texto">
                {f.origen === 'ingreso' ? 'De un ingreso repartido' : 'Agregado a mano'}
                {f.etiqueta && <strong> · {f.etiqueta}</strong>}
                {f.nota && ` · ${f.nota}`}
              </span>
              <span className="funding-history__monto">+<Amount value={f.monto} /></span>
              {onEditEtiqueta && (
                <button
                  type="button"
                  className="funding-history__undo"
                  onClick={() => empezarEdicion(f)}
                  aria-label="Cambiar grupo"
                >
                  <Pencil size={14} />
                </button>
              )}
            </>
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

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DebtRow } from './DebtRow';
import { Amount } from '../ui/Amount';
import './DebtsSection.css';

export function DebtsSection({ debts, onMarkPaid, onDelete }) {
  const [showPagadas, setShowPagadas] = useState(false);

  const { activas, pagadas, totalTeDeben, totalDebes } = useMemo(() => {
    const activas = debts.filter((d) => !d.pagado);
    const pagadas = debts.filter((d) => d.pagado);
    const totalTeDeben = activas.filter((d) => d.tipo === 'prestado').reduce((sum, d) => sum + Number(d.monto), 0);
    const totalDebes = activas.filter((d) => d.tipo === 'debo').reduce((sum, d) => sum + Number(d.monto), 0);
    return { activas, pagadas, totalTeDeben, totalDebes };
  }, [debts]);

  return (
    <div className="debts-section">
      <div className="debts-section__totales">
        <div className="debts-section__total">
          <span>Te deben</span>
          <strong className="debts-section__total--mint"><Amount value={totalTeDeben} /></strong>
        </div>
        <div className="debts-section__total">
          <span>Debes</span>
          <strong className="debts-section__total--coral"><Amount value={totalDebes} /></strong>
        </div>
      </div>

      {activas.length === 0 ? (
        <p className="debts-section__vacio">No tienes deudas ni préstamos activos.</p>
      ) : (
        <div className="debts-section__lista">
          {activas.map((d) => (
            <DebtRow key={d.id} debt={d} onMarkPaid={onMarkPaid} onDelete={onDelete} />
          ))}
        </div>
      )}

      {pagadas.length > 0 && (
        <>
          <button className="debts-section__toggle" onClick={() => setShowPagadas((v) => !v)}>
            {showPagadas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showPagadas ? 'Ocultar saldadas' : `Ver saldadas (${pagadas.length})`}
          </button>
          {showPagadas && (
            <div className="debts-section__lista">
              {pagadas.map((d) => (
                <DebtRow key={d.id} debt={d} onMarkPaid={onMarkPaid} onDelete={onDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

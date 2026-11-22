import { TrendingUp } from 'lucide-react';
import { Amount } from '../ui/Amount';
import '../expenses/ExpenseCard.css';

export function IncomeCard({ income, onEdit, onDelete }) {
  const fecha = new Date(income.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="ticket">
      <button
        className="ticket__main ticket__main--clickable"
        onClick={() => onEdit(income)}
        aria-label="Editar ingreso"
        disabled={income.pending}
      >
        <div className="ticket__icon" style={{ background: 'var(--color-mint-soft)', color: 'var(--color-mint)' }}>
          <TrendingUp size={18} />
        </div>
        <div className="ticket__info">
          <span className="ticket__category">{income.nota || 'Ingreso'}</span>
          {income.pending && (
            <span className="ticket__pending">{income.sync_failed ? 'No se pudo subir' : 'Sin sincronizar'}</span>
          )}
        </div>
        <div className="ticket__right">
          <span className="ticket__monto" style={{ color: 'var(--color-mint)' }}>
            +<Amount value={income.monto} />
          </span>
          <span className="ticket__fecha">{fecha}</span>
        </div>
      </button>
      {!income.pending && (
        <>
          <div className="ticket__perforation" aria-hidden="true" />
          <button className="ticket__delete" onClick={() => onDelete(income.id)} aria-label="Eliminar ingreso">
            Eliminar
          </button>
        </>
      )}
    </div>
  );
}

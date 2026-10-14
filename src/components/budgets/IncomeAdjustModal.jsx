import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

// Confirmación al cambiar el monto de un ingreso ya repartido en categorías.
export function IncomeAdjustModal({ ajuste, ajustando, onConfirm, onBack, onClose }) {
  return (
    <Modal open={!!ajuste} onClose={onClose} title="Ajustar el reparto">
      {ajuste && (
        <div className="expense-form">
          <p className="dashboard__empty">
            Cambiaste el ingreso de {formatCurrency(Number(ajuste.ingreso.monto))} a {formatCurrency(ajuste.montoNuevo)}.
            Estaba repartido en estas categorías, que se ajustan en la misma proporción:
          </p>
          <ul className="dashboard__empty">
            {ajuste.cambios.map((c) => (
              <li key={c.funding.id}>
                <b>{c.categoria}</b>: {formatCurrency(Number(c.funding.monto))} → {formatCurrency(c.nuevo)}
              </li>
            ))}
          </ul>
          {ajuste.advertencias.map((a) => (
            <p key={a.categoria} className="auth-error" role="alert">
              Ojo: {a.categoria} quedará en {formatCurrency(a.saldoDespues)} porque ya se gastó parte de esa plata.
            </p>
          ))}
          <Button type="button" fullWidth onClick={onConfirm} disabled={ajustando}>
            {ajustando ? 'Ajustando…' : 'Sí, confirmar y ajustar'}
          </Button>
          <Button type="button" variant="ghost" fullWidth disabled={ajustando} onClick={onBack}>
            Volver a editar
          </Button>
        </div>
      )}
    </Modal>
  );
}

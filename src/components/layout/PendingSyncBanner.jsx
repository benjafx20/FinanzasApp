import { Button } from '../ui/Button';
import './PendingSyncBanner.css';

// Muestra cuánto falta por subir y, si algo fue rechazado varias veces, deja descartarlo.
export function PendingSyncBanner({ pendientes, fallidas, gastosPendientes = 0, sincronizando, isOnline, onDescartar }) {
  const total = pendientes + gastosPendientes;
  if (total === 0) return null;
  const sinProblema = pendientes - fallidas + gastosPendientes;

  return (
    <div className={`pending-banner ${fallidas > 0 ? 'pending-banner--error' : ''}`} role="status">
      <span>
        {fallidas > 0
          ? `${fallidas} ${fallidas === 1 ? 'movimiento no se pudo' : 'movimientos no se pudieron'} guardar en el servidor.`
          : null}
        {fallidas > 0 && sinProblema > 0 ? ' ' : null}
        {sinProblema > 0
          ? isOnline
            ? sincronizando
              ? `Subiendo ${sinProblema} ${sinProblema === 1 ? 'movimiento' : 'movimientos'}…`
              : `${sinProblema} ${sinProblema === 1 ? 'movimiento' : 'movimientos'} por subir.`
            : `${sinProblema} ${sinProblema === 1 ? 'movimiento' : 'movimientos'} por subir cuando vuelva la señal.`
          : null}
      </span>
      {fallidas > 0 && (
        <Button type="button" size="sm" variant="ghost" onClick={onDescartar}>
          Descartar los fallidos
        </Button>
      )}
    </div>
  );
}

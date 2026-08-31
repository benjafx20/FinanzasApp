import './OfflineBanner.css';

export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      Sin conexión — los gastos que registres se guardan en el celular y se suben solos al volver la señal.
    </div>
  );
}

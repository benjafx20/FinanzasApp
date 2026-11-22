import './OfflineBanner.css';

export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      Sin conexión — los gastos, ingresos y aportes (a categorías y a metas) que registres se guardan en el celular y se suben solos al volver la señal. Traspasos, deudas y metas nuevas necesitan conexión.
    </div>
  );
}

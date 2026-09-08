import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/formatCurrency';

// Reemplaza a formatCurrency() en cualquier lugar donde se MUESTRE un
// monto (no en los formularios donde el usuario lo está escribiendo —
// ahí no tiene sentido ocultarlo). Cuando el modo lectura está activo,
// muestra puntitos en vez del número, conservando el signo "-" si es
// negativo para no perder esa información visual (la barra roja/verde
// de cada tarjeta ya avisa igual).
export function Amount({ value, className }) {
  const { hidden } = usePrivacy();
  if (!hidden) return <span className={className}>{formatCurrency(value)}</span>;
  const negativo = Number(value) < 0;
  return <span className={className}>{negativo ? '-' : ''}•••••</span>;
}

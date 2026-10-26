import { UMBRAL_DIAS_INVENTARIO } from '../../utils/inventory';

// Línea compacta que solo aparece si hay equipos pasados del plazo sin venderse.
export function InventoryAlert({ equipos, onOpen }) {
  const lista = equipos.slice(0, 3).map((e) => `${e.nombre} (${e.dias} d)`).join(', ');
  const resto = equipos.length - 3;
  return (
    <button
      type="button"
      onClick={() => onOpen(equipos[0].categoria)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        marginBottom: 12,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-primary-soft)',
        color: 'var(--color-ink)',
        fontSize: 13,
      }}
    >
      ⚠ {equipos.length === 1 ? '1 equipo lleva' : `${equipos.length} equipos llevan`} {UMBRAL_DIAS_INVENTARIO} días o más
      sin venderse: {lista}
      {resto > 0 ? ` y ${resto} más` : ''}
    </button>
  );
}

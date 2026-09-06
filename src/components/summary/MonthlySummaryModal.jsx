import { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import { buildMonthlySummary } from '../../utils/monthlySummary';
import { monthLabel, generarResumenConversado } from '../../utils/summaryText';
import './MonthlySummaryModal.css';

// `initialMonthKey`: si viene (ej: se abrió solo al detectar un mes
// nuevo), parte mostrando el detalle de ese mes directo, con un link
// para volver a la lista. Si no viene, parte en la lista.
export function MonthlySummaryModal({
  open,
  onClose,
  closedMonths,
  initialMonthKey,
  expenses,
  fundings,
  transfers,
  contributions,
  categories,
}) {
  const [monthKey, setMonthKey] = useState(initialMonthKey || null);

  const stats = useMemo(() => {
    if (!monthKey) return null;
    return buildMonthlySummary({ monthKey, expenses, fundings, transfers, contributions, categories });
  }, [monthKey, expenses, fundings, transfers, contributions, categories]);

  const frases = useMemo(
    () => (stats ? generarResumenConversado(stats, formatCurrency) : []),
    [stats]
  );

  const titulo = monthKey ? `✨ ${monthLabel(monthKey)}` : 'Resúmenes mensuales';

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      {monthKey && stats ? (
        <div className="monthly-summary">
          <div className="monthly-summary__frases">
            {frases.map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>

          <div className="monthly-summary__chips">
            <div className="monthly-summary__chip">
              <span>Gastado</span>
              <strong>{formatCurrency(stats.totalGastado)}</strong>
            </div>
            {stats.ahorroLogrado > 0 && (
              <div className="monthly-summary__chip">
                <span>Ahorrado</span>
                <strong>{formatCurrency(stats.ahorroLogrado)}</strong>
              </div>
            )}
            <div className="monthly-summary__chip">
              <span>Balance al cierre</span>
              <strong className={stats.balanceAlCierre < 0 ? 'monthly-summary__chip--negativo' : ''}>
                {formatCurrency(stats.balanceAlCierre)}
              </strong>
            </div>
          </div>

          {stats.categoriaTop && (
            <div className="monthly-summary__top-categoria">
              <span
                className="monthly-summary__top-icon"
                style={{ background: `${stats.categoriaTop.color}22`, color: stats.categoriaTop.color }}
              >
                <CategoryIcon name={stats.categoriaTop.icono} size={16} />
              </span>
              <span>{stats.categoriaTop.nombre} fue tu categoría más movida</span>
            </div>
          )}

          {closedMonths.length > 1 && (
            <button className="monthly-summary__volver" onClick={() => setMonthKey(null)}>
              <ChevronLeft size={16} /> Ver otros meses
            </button>
          )}
        </div>
      ) : (
        <div className="monthly-summary__lista">
          {closedMonths.length === 0 ? (
            <p className="monthly-summary__vacio">Todavía no hay ningún mes cerrado para resumir.</p>
          ) : (
            closedMonths.map((key) => (
              <button key={key} className="monthly-summary__mes-btn" onClick={() => setMonthKey(key)}>
                {monthLabel(key)}
              </button>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

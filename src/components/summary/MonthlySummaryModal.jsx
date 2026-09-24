import { useState, useMemo } from 'react';
import { ChevronLeft, Share2, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import { Amount } from '../ui/Amount';
import { buildMonthlySummary } from '../../utils/monthlySummary';
import { monthLabel, generarResumenConversado } from '../../utils/summaryText';
import { generateSummaryImage } from '../../utils/generateSummaryImage';
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
  debts,
  categories,
}) {
  const [monthKey, setMonthKey] = useState(initialMonthKey || null);
  const [compartiendo, setCompartiendo] = useState(false);
  const [shareError, setShareError] = useState('');

  const stats = useMemo(() => {
    if (!monthKey) return null;
    return buildMonthlySummary({ monthKey, expenses, fundings, transfers, contributions, debts, categories });
  }, [monthKey, expenses, fundings, transfers, contributions, debts, categories]);

  const frases = useMemo(
    () => (stats ? generarResumenConversado(stats) : []),
    [stats]
  );

  const handleCompartir = async () => {
    setShareError('');
    setCompartiendo(true);
    try {
      const label = monthLabel(monthKey);
      const blob = await generateSummaryImage({ monthLabel: label, stats, formatCurrency });
      const file = new File([blob], `resumen-${monthKey}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Resumen de ${label}`,
          text: `Mi resumen de ${label} en Mis Finanzas`,
        });
      } else {
        // Respaldo para navegadores/computadores sin la API de compartir
        // con archivos: se descarga la imagen directo.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen-${monthKey}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // El usuario cancelando el share sheet también cae acá (AbortError)
      // — no es un error real, no hay nada que avisar en ese caso.
      if (err.name !== 'AbortError') {
        setShareError('No se pudo generar la imagen. Intenta de nuevo.');
      }
    } finally {
      setCompartiendo(false);
    }
  };

  const titulo = monthKey ? `✨ ${monthLabel(monthKey)}` : 'Resúmenes mensuales';

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      {monthKey && stats ? (
        <div className="monthly-summary">
          <div className="monthly-summary__frases">
            {frases.map((partes, i) => (
              <p key={i}>
                {partes.map((parte, j) =>
                  typeof parte === 'string'
                    ? <span key={j}>{parte}</span>
                    : <Amount key={j} value={parte.monto} />
                )}
              </p>
            ))}
          </div>

          <div className="monthly-summary__chips">
            <div className="monthly-summary__chip">
              <span>Gastado</span>
              <strong><Amount value={stats.totalGastado} /></strong>
            </div>
            {stats.ahorroLogrado > 0 && (
              <div className="monthly-summary__chip">
                <span>Ahorrado</span>
                <strong><Amount value={stats.ahorroLogrado} /></strong>
              </div>
            )}
            {stats.totalTeDebenAlCierre > 0 && (
              <div className="monthly-summary__chip">
                <span>Te debían</span>
                <strong><Amount value={stats.totalTeDebenAlCierre} /></strong>
              </div>
            )}
            {stats.totalDebesAlCierre > 0 && (
              <div className="monthly-summary__chip">
                <span>Debías</span>
                <strong className="monthly-summary__chip--negativo"><Amount value={stats.totalDebesAlCierre} /></strong>
              </div>
            )}
            <div className="monthly-summary__chip">
              <span>Balance al cierre</span>
              <strong className={stats.balanceAlCierre < 0 ? 'monthly-summary__chip--negativo' : ''}>
                <Amount value={stats.balanceAlCierre} />
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

          <button className="monthly-summary__compartir" onClick={handleCompartir} disabled={compartiendo}>
            {compartiendo ? <Loader2 size={16} className="monthly-summary__spin" /> : <Share2 size={16} />}
            {compartiendo ? 'Generando…' : 'Compartir resumen'}
          </button>
          {shareError && <p className="monthly-summary__share-error">{shareError}</p>}

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

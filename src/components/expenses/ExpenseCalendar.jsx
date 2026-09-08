import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpenseCard } from './ExpenseCard';
import { Amount } from '../ui/Amount';
import './ExpenseCalendar.css';

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Grilla de semanas de lunes a domingo (igual que el resto de la app),
// con celdas vacías (null) para completar la primera y última semana.
function getMonthGrid(year, monthIndex0) {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function ExpenseCalendar({ expenses, onEdit, onDelete }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const { grid, totalPorDia, maxDia } = useMemo(() => {
    const grid = getMonthGrid(year, month);
    const totalPorDia = {};
    for (const e of expenses) {
      totalPorDia[e.fecha] = (totalPorDia[e.fecha] || 0) + Number(e.monto);
    }
    const maxDia = Math.max(0, ...Object.values(totalPorDia));
    return { grid, totalPorDia, maxDia };
  }, [expenses, year, month]);

  const cambiarMes = (delta) => {
    setViewDate(new Date(year, month + delta, 1));
    setSelectedDay(null);
  };

  const gastosDelDiaSeleccionado = selectedDay
    ? expenses.filter((e) => e.fecha === selectedDay).sort((a, b) => b.monto - a.monto)
    : [];
  const totalDiaSeleccionado = gastosDelDiaSeleccionado.reduce((sum, e) => sum + Number(e.monto), 0);

  return (
    <div className="expense-calendar">
      <div className="expense-calendar__nav">
        <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
        <span className="expense-calendar__mes">{MESES[month]} {year}</span>
        <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
      </div>

      <div className="expense-calendar__semana-labels">
        {DIAS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      <div className="expense-calendar__grid">
        {grid.map((date, i) => {
          if (!date) return <div key={i} className="expense-calendar__cell expense-calendar__cell--vacia" />;
          const iso = toISO(date);
          const total = totalPorDia[iso] || 0;
          const intensidad = maxDia > 0 ? Math.min(total / maxDia, 1) : 0;
          const esHoy = iso === toISO(new Date());
          const esSeleccionado = iso === selectedDay;

          return (
            <button
              key={i}
              className={`expense-calendar__cell ${esHoy ? 'expense-calendar__cell--hoy' : ''} ${esSeleccionado ? 'expense-calendar__cell--seleccionado' : ''}`}
              onClick={() => setSelectedDay(esSeleccionado ? null : iso)}
            >
              {total > 0 && (
                <span className="expense-calendar__heat" style={{ opacity: 0.18 + intensidad * 0.65 }} />
              )}
              <span className="expense-calendar__num">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="expense-calendar__detalle">
          <div className="expense-calendar__detalle-header">
            <span>{new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <strong><Amount value={totalDiaSeleccionado} /></strong>
          </div>
          {gastosDelDiaSeleccionado.length === 0 ? (
            <p className="dashboard__empty">Sin gastos ese día.</p>
          ) : (
            <div className="expense-calendar__lista">
              {gastosDelDiaSeleccionado.map((e) => (
                <ExpenseCard key={e.id} expense={e} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { Amount } from '../ui/Amount';
import './GoalCard.css';

export function GoalCard({ goal, acumulado, onAportar, onDelete }) {
  const pct = Math.min((acumulado / goal.monto_objetivo) * 100, 100);
  const completa = acumulado >= goal.monto_objetivo;

  return (
    <div className={`goal-card ${completa ? 'goal-card--completa' : ''}`}>
      <div className="goal-card__top">
        <span className="goal-card__nombre">
          {goal.nombre} {completa && <span aria-hidden="true">✓</span>}
        </span>
        <button className="goal-card__delete" onClick={() => onDelete(goal.id)} aria-label={`Eliminar meta ${goal.nombre}`}>
          ✕
        </button>
      </div>

      <div className="goal-card__ring-wrap">
        <svg viewBox="0 0 100 100" className="goal-card__ring">
          <circle cx="50" cy="50" r="42" className="goal-card__ring-track" />
          <circle
            cx="50"
            cy="50"
            r="42"
            className="goal-card__ring-fill"
            style={{
              strokeDasharray: 2 * Math.PI * 42,
              strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100),
              stroke: completa ? 'var(--color-mint)' : 'var(--color-primary)',
            }}
          />
        </svg>
        <span className="goal-card__pct">{Math.round(pct)}%</span>
      </div>

      <div className="goal-card__montos">
        <span className="goal-card__acumulado"><Amount value={acumulado} /></span>
        <span className="goal-card__objetivo"> de <Amount value={goal.monto_objetivo} /></span>
      </div>

      {!completa && (
        <button className="goal-card__aportar" onClick={onAportar}>
          + Aportar
        </button>
      )}
    </div>
  );
}

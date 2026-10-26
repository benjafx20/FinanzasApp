import { Pencil } from 'lucide-react';
import { Amount } from '../ui/Amount';
import './GoalCard.css';

export function GoalCard({ goal, acumulado, onAportar, onEdit, onDelete, onCerrar, onReabrir, onVerAportes }) {
  const pct = Math.min((acumulado / goal.monto_objetivo) * 100, 100);
  const completa = acumulado >= goal.monto_objetivo;
  const cerrada = !!goal.completed_at;

  return (
    <div className={`goal-card ${completa ? 'goal-card--completa' : ''}`}>
      <div className="goal-card__top">
        <span className="goal-card__nombre">
          {goal.nombre} {completa && <span aria-hidden="true">✓</span>}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          <button className="goal-card__delete" onClick={() => onEdit(goal)} aria-label={`Editar meta ${goal.nombre}`}>
            <Pencil size={12} />
          </button>
          {!cerrada && (
            <button className="goal-card__delete" onClick={() => onDelete(goal.id)} aria-label={`Eliminar meta ${goal.nombre}`}>
              ✕
            </button>
          )}
        </span>
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

      <button className="goal-card__aportar" onClick={() => onVerAportes(goal)}>
        Ver aportes
      </button>
      {!completa && !cerrada && (
        <button className="goal-card__aportar" onClick={onAportar}>
          + Aportar
        </button>
      )}
      {completa && !cerrada && (
        <button className="goal-card__aportar" onClick={() => onCerrar(goal)}>
          Ya usé la plata
        </button>
      )}
      {cerrada && (
        <>
          <span className="goal-card__objetivo">
            {goal.used_for
              ? `Gastada en: ${goal.used_for}${goal.used_at ? ` · ${goal.used_at.split('-').reverse().join('-')}` : ''}`
              : 'Cerrada: la plata ya se usó'}
          </span>
          <button className="goal-card__aportar" onClick={() => onReabrir(goal)}>
            Reabrir
          </button>
        </>
      )}
    </div>
  );
}

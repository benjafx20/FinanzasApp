import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Amount } from '../ui/Amount';
import { ContributionForm } from './ContributionForm';
import { confirmar, alertar } from '../../utils/dialogs';

// Historial de aportes de una meta: se puede corregir el monto y de dónde salió
// la plata, o deshacer un aporte (la plata vuelve a su categoría).
export function GoalDetailModal({ goal, contributions, categories, allCategories, saldoPorCategoria, onUpdate, onDelete, onClose }) {
  const [editando, setEditando] = useState(null);
  const lista = goal
    ? contributions.filter((c) => c.goal_id === goal.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const nombreCategoria = (id) => allCategories.find((c) => c.id === id)?.nombre;

  const cerrar = () => {
    setEditando(null);
    onClose();
  };

  const deshacer = async (aporte) => {
    if (!(await confirmar('¿Deshacer este aporte? La plata vuelve a la categoría de donde salió.'))) return;
    try {
      await onDelete(aporte.id);
    } catch (err) {
      alertar(err.message);
    }
  };

  return (
    <Modal open={!!goal} onClose={cerrar} title={editando ? 'Corregir aporte' : `Aportes a "${goal?.nombre ?? ''}"`}>
      {goal &&
        (editando ? (
          <ContributionForm
            goal={goal}
            contribution={editando}
            categories={categories}
            saldoPorCategoria={saldoPorCategoria}
            onSubmit={(_goalId, monto, origen) => onUpdate(editando.id, { monto, sourceCategoryId: origen })}
            onDone={() => setEditando(null)}
          />
        ) : lista.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay aportes en esta meta.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map((c) => (
              <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {c.fecha.split('-').reverse().join('-')} ·{' '}
                  {c.source_category_id
                    ? `de ${nombreCategoria(c.source_category_id) || 'una categoría eliminada'}`
                    : 'sin origen (no descontó)'}
                </span>
                <strong><Amount value={c.monto} /></strong>
                <button type="button" className="funding-history__undo" onClick={() => setEditando(c)} aria-label="Corregir aporte">
                  <Pencil size={14} />
                </button>
                <button type="button" className="funding-history__undo" onClick={() => deshacer(c)} aria-label="Deshacer aporte">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
}

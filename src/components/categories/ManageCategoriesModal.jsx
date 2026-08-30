import { useState } from 'react';
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Pencil, Plus } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Modal } from '../ui/Modal';
import { CategoryForm } from './CategoryForm';
import './ManageCategoriesModal.css';

export function ManageCategoriesModal({ categories, onMove, onToggleHidden, onCheckUsage, onDelete, onUpdate, onAdd }) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const handleDelete = async (cat) => {
    setError('');
    if (!cat.user_id) {
      setError('Las categorías predefinidas no se pueden eliminar — puedes ocultarlas con el ícono del ojo.');
      return;
    }
    setBusyId(cat.id);
    try {
      const usage = await onCheckUsage(cat.id);
      const total = usage.gastos + usage.recurrentes;
      const mensaje = total > 0
        ? `"${cat.nombre}" tiene ${usage.gastos} gasto(s) y ${usage.recurrentes} gasto(s) recurrente(s) asociados.\n\nNo se borrará ningún gasto, pero perderán la categoría asignada (quedarán marcados como "Sin categoría").\n\n¿Quieres continuar?`
        : `¿Eliminar la categoría "${cat.nombre}"?`;
      if (!window.confirm(mensaje)) {
        setBusyId(null);
        return;
      }
      await onDelete(cat.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="manage-categories">
      <p className="manage-categories__hint">
        Ordena tus categorías más usadas arriba, ocúltalas, o edita/elimina las tuyas propias.
      </p>
      <button type="button" className="manage-categories__add" onClick={() => setShowNewModal(true)}>
        <Plus size={16} /> Nueva categoría
      </button>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <ul className="manage-categories__list">
        {categories.map((cat, i) => (
          <li
            key={cat.id}
            className={`manage-categories__row ${cat.oculta ? 'manage-categories__row--oculta' : ''}`}
          >
            <span className="manage-categories__icon" style={{ background: `${cat.color}22`, color: cat.color }}>
              <CategoryIcon name={cat.icono} size={16} />
            </span>
            <span className="manage-categories__nombre">
              {cat.nombre}
              {!cat.user_id && <span className="manage-categories__badge">predefinida</span>}
            </span>
            <div className="manage-categories__actions">
              <button type="button" onClick={() => onMove(cat.id, -1)} disabled={i === 0} aria-label="Subir">
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => onMove(cat.id, 1)}
                disabled={i === categories.length - 1}
                aria-label="Bajar"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => onToggleHidden(cat.id, !cat.oculta)}
                aria-label={cat.oculta ? 'Mostrar' : 'Ocultar'}
              >
                {cat.oculta ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              {cat.user_id && (
                <>
                  <button type="button" onClick={() => setEditingCategory(cat)} aria-label={`Editar ${cat.nombre}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="manage-categories__delete"
                    onClick={() => handleDelete(cat)}
                    disabled={busyId === cat.id}
                    aria-label={`Eliminar ${cat.nombre}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} title="Editar categoría">
        {editingCategory && (
          <CategoryForm
            category={editingCategory}
            onSubmit={(values) => onUpdate(editingCategory.id, values)}
            onDone={() => setEditingCategory(null)}
          />
        )}
      </Modal>

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Nueva categoría">
        <CategoryForm onSubmit={onAdd} onDone={() => setShowNewModal(false)} />
      </Modal>
    </div>
  );
}

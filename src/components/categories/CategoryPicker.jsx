import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Modal } from '../ui/Modal';
import { CategoryForm } from './CategoryForm';
import { ManageCategoriesModal } from './ManageCategoriesModal';

export function CategoryPicker({
  categories,
  allCategories,
  categoryId,
  onChange,
  onAddCategory,
  onUpdateCategory,
  onMoveCategory,
  onToggleHidden,
  onCheckUsage,
  onDeleteCategory,
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const handleCreate = async (values) => {
    const nueva = await onAddCategory(values);
    onChange(nueva.id);
  };

  return (
    <>
      <div className="category-picker">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-chip ${categoryId === cat.id ? 'category-chip--active' : ''}`}
            style={categoryId === cat.id ? { background: cat.color, color: 'white' } : { color: cat.color }}
            onClick={() => onChange(cat.id)}
          >
            <CategoryIcon name={cat.icono} size={16} />
            {cat.nombre}
          </button>
        ))}
        <button type="button" className="category-chip category-chip--add" onClick={() => setShowNewModal(true)}>
          <Plus size={16} />
          Nueva
        </button>
        <button
          type="button"
          className="category-chip category-chip--add"
          onClick={() => setShowManageModal(true)}
          aria-label="Editar categorías"
        >
          <Settings2 size={16} />
        </button>
      </div>

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Nueva categoría">
        <CategoryForm onSubmit={handleCreate} onDone={() => setShowNewModal(false)} />
      </Modal>

      <Modal open={showManageModal} onClose={() => setShowManageModal(false)} title="Editar categorías">
        <ManageCategoriesModal
          categories={allCategories}
          onMove={onMoveCategory}
          onToggleHidden={onToggleHidden}
          onCheckUsage={onCheckUsage}
          onDelete={onDeleteCategory}
          onUpdate={onUpdateCategory}
        />
      </Modal>
    </>
  );
}

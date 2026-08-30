import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ICON_MAP, CategoryIcon } from '../../utils/CategoryIcon';
import './CategoryForm.css';

const COLOR_OPTIONS = [
  '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#06D6A0',
  '#FFC145', '#FF6B6B', '#7C5CFC', '#14B8A6', '#F97316', '#6B7280',
];

export function CategoryForm({ category, onSubmit, onDone }) {
  const isEditing = !!category;
  const [nombre, setNombre] = useState(category?.nombre ?? '');
  const [icono, setIcono] = useState(category?.icono ?? '');
  const [color, setColor] = useState(category?.color ?? COLOR_OPTIONS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!icono) {
      setError('Elige un ícono para la categoría.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ nombre, icono, color });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <Input
        id="cat-nombre"
        label="Nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Celular, Mascotas, Suscripciones"
        required
        maxLength={30}
      />

      <div className="input-group">
        <span className="input-label">Ícono</span>
        <div className="icon-picker">
          {Object.entries(ICON_MAP).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              className={`icon-picker__option ${icono === key ? 'icon-picker__option--active' : ''}`}
              style={icono === key ? { background: color, borderColor: color, color: 'white' } : {}}
              onClick={() => setIcono(key)}
              aria-label={`Ícono ${key}`}
              aria-pressed={icono === key}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="input-group">
        <span className="input-label">Color</span>
        <div className="color-picker">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-picker__option ${color === c ? 'color-picker__option--active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
      </div>

      {icono && (
        <div className="category-preview">
          <span className="category-preview__icon" style={{ background: `${color}22`, color }}>
            <CategoryIcon name={icono} size={18} />
          </span>
          <span className="category-preview__label">{nombre || 'Vista previa'}</span>
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear categoría'}
      </Button>
    </form>
  );
}

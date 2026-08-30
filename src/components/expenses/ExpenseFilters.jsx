import { Search, X } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import './ExpenseFilters.css';

export function ExpenseFilters({ query, onQueryChange, categoryId, onCategoryChange, categories }) {
  return (
    <div className="expense-filters">
      <div className="expense-filters__search">
        <Search size={15} className="expense-filters__search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar por nota…"
          className="expense-filters__search-input"
        />
        {query && (
          <button type="button" className="expense-filters__clear" onClick={() => onQueryChange('')} aria-label="Limpiar búsqueda">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="expense-filters__chips">
        <button
          type="button"
          className={`category-chip ${categoryId === null ? 'category-chip--active' : ''}`}
          onClick={() => onCategoryChange(null)}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-chip ${categoryId === cat.id ? 'category-chip--active' : ''}`}
            style={categoryId === cat.id ? { background: cat.color, color: 'white' } : { color: cat.color }}
            onClick={() => onCategoryChange(cat.id)}
          >
            <CategoryIcon name={cat.icono} size={14} />
            {cat.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

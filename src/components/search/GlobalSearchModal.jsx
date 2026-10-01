import { useState, useMemo } from 'react';
import { Search, X, Receipt, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { searchAll } from '../../utils/globalSearch';
import { Amount } from '../ui/Amount';
import './GlobalSearchModal.css';

function ResultIcon({ resultado }) {
  if (resultado.tipo === 'gasto') {
    const cat = resultado.raw.categories;
    return (
      <span className="global-search__icon" style={{ background: `${cat?.color || '#6B7280'}22`, color: cat?.color || '#6B7280' }}>
        <CategoryIcon name={cat?.icono} size={15} />
      </span>
    );
  }
  if (resultado.tipo === 'ingreso') {
    return (
      <span className="global-search__icon global-search__icon--mint">
        <TrendingUp size={15} />
      </span>
    );
  }
  const esPrestamo = resultado.raw.tipo === 'prestado';
  return (
    <span className={`global-search__icon ${esPrestamo ? 'global-search__icon--mint' : 'global-search__icon--coral'}`}>
      {esPrestamo ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
    </span>
  );
}

export function GlobalSearchModal({ open, onClose, expenses, incomes, debts, categories, onSelectExpense, onSelectIncome }) {
  const [query, setQuery] = useState('');

  const resultados = useMemo(
    () => searchAll({ query, expenses, incomes, debts, categories }),
    [query, expenses, incomes, debts, categories]
  );

  const handleSelect = (resultado) => {
    if (resultado.tipo === 'gasto') onSelectExpense(resultado.raw);
    if (resultado.tipo === 'ingreso') onSelectIncome(resultado.raw);
    // Las deudas no tienen un formulario de edición propio todavía — se
    // dejan solo como resultado informativo.
    if (resultado.tipo !== 'deuda') onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Buscar">
      <div className="global-search">
        <div className="global-search__input-wrap">
          <Search size={16} className="global-search__input-icon" />
          <input
            type="text"
            className="global-search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por nota, grupo, categoría o persona…"
            autoFocus
          />
          {query && (
            <button className="global-search__clear" onClick={() => setQuery('')} aria-label="Limpiar">
              <X size={14} />
            </button>
          )}
        </div>

        {!query.trim() ? (
          <p className="global-search__hint">
            <Receipt size={14} /> Busca entre tus gastos, ingresos y deudas a la vez.
          </p>
        ) : resultados.length === 0 ? (
          <p className="global-search__hint">Sin resultados para "{query}".</p>
        ) : (
          <div className="global-search__lista">
            {resultados.map((r) => (
              <button
                key={`${r.tipo}-${r.id}`}
                className={`global-search__item ${r.tipo === 'deuda' ? 'global-search__item--sin-click' : ''}`}
                onClick={() => handleSelect(r)}
              >
                <ResultIcon resultado={r} />
                <div className="global-search__info">
                  <span className="global-search__titulo">{r.titulo}</span>
                  {r.subtitulo && <span className="global-search__subtitulo">{r.subtitulo}</span>}
                </div>
                <div className="global-search__right">
                  <span className="global-search__monto"><Amount value={r.monto} /></span>
                  <span className="global-search__fecha">
                    {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

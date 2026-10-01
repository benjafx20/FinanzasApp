import { useEffect, useMemo, useState } from 'react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import { ExpenseCard } from '../expenses/ExpenseCard';
import { FundingHistory } from './FundingHistory';
import './CategoryDetailModal.css';

// `asignado`: total que le has metido a esta categoría (tu presupuesto real
// para ella). `saldo`: lo que te queda (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
export function CategoryDetailModal({
  category,
  asignado,
  saldo,
  gastadoSemana,
  gastadoMes,
  fundingsDeCategoria,
  onUndoFunding,
  onDeleteIncome,
  expensesDeCategoria,
  onAddExpense,
  onAddFunds,
  onOpenTransfer,
  onEditCategory,
  onDeleteCategory,
  onEditExpense,
  onDeleteExpense,
}) {
  const saldoNegativo = saldo < 0;
  const saldoBajo = !saldoNegativo && asignado > 0 && saldo <= asignado * 0.2;
  const [expenseLimit, setExpenseLimit] = useState(4);
  const [fundingLimit, setFundingLimit] = useState(4);
  const [grupoActivo, setGrupoActivo] = useState(null);

  useEffect(() => {
    setExpenseLimit(4);
    setFundingLimit(4);
    setGrupoActivo(null);
  }, [category?.id]);

  const expensesOrdenados = useMemo(
    // Orden por fecha y, si empatan (mismo día), por hora real de creación:
    // sin esto, Postgres no garantiza un orden estable entre filas con la
    // misma fecha y el listado se veía "desordenado" al azar.
    () =>
      [...expensesDeCategoria].sort((a, b) => {
        const porFecha = new Date(b.fecha) - new Date(a.fecha);
        if (porFecha !== 0) return porFecha;
        return new Date(b.created_at) - new Date(a.created_at);
      }),
    [expensesDeCategoria]
  );

  // Grupos dentro de la categoría (ej: "Samsung A06" agrupa la pantalla, la
  // placa, etc. dentro de "Celulares"), para ver cuánto se ha ido en un
  // artículo puntual sin salir de la categoría.
  const grupos = useMemo(() => {
    const porNombre = new Map();
    for (const exp of expensesOrdenados) {
      if (!exp.etiqueta) continue;
      const actual = porNombre.get(exp.etiqueta) || { nombre: exp.etiqueta, total: 0, cantidad: 0 };
      actual.total += Number(exp.monto);
      actual.cantidad += 1;
      porNombre.set(exp.etiqueta, actual);
    }
    return [...porNombre.values()].sort((a, b) => b.total - a.total);
  }, [expensesOrdenados]);

  const expensesFiltrados = grupoActivo
    ? expensesOrdenados.filter((exp) => exp.etiqueta === grupoActivo)
    : expensesOrdenados;
  const gastosVisibles = expensesFiltrados.slice(0, expenseLimit);
  const hayMasGastos = expensesFiltrados.length > expenseLimit;

  const fundingsVisibles = fundingsDeCategoria.slice(0, fundingLimit);
  const hayMasFundings = fundingsDeCategoria.length > fundingLimit;

  return (
    <div className="category-detail">
      <div className="category-detail__header">
        <span className="category-detail__icon" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.icono} size={22} />
        </span>
        <div>
          <span className="category-detail__nombre">{category.nombre}</span>
          {!category.user_id && <span className="category-detail__badge">predefinida</span>}
        </div>
      </div>

      {saldoBajo && (
        <span className="category-detail__aviso">⚠ Queda poco saldo en esta categoría</span>
      )}

      <span
        className={`category-detail__saldo ${saldoNegativo ? 'category-detail__saldo--negativo' : ''} ${saldoBajo ? 'category-detail__saldo--bajo' : ''}`}
      >
        <Amount value={saldo} />
      </span>
      <span className="category-detail__saldo-label">te queda</span>

      <div className="category-detail__stats">
        <span>Total: <strong><Amount value={asignado} /></strong></span>
        <span>Semana: <strong><Amount value={gastadoSemana} /></strong></span>
        <span>Mes: <strong><Amount value={gastadoMes} /></strong></span>
      </div>

      <div className="category-detail__actions">
        <button type="button" onClick={onAddExpense}>+ Gasto</button>
        <button type="button" onClick={onAddFunds}>+ Agregar plata</button>
        <button type="button" onClick={onOpenTransfer}>Mover plata</button>
      </div>

      <div className="category-detail__fundings">
        <span className="category-detail__expenses-title">Aportes recibidos</span>
        {fundingsDeCategoria.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay aportes en esta categoría.</p>
        ) : (
          <>
            <FundingHistory fundings={fundingsVisibles} onUndo={onUndoFunding} onDeleteIncome={onDeleteIncome} />
            {hayMasFundings && (
              <button
                type="button"
                className="category-detail__show-more"
                onClick={() => setFundingLimit((n) => n + 4)}
              >
                Ver 4 más
              </button>
            )}
          </>
        )}
      </div>

      {category.user_id && (
        <div className="category-detail__manage">
          <button type="button" onClick={onEditCategory}>Editar categoría</button>
          <button type="button" className="category-detail__delete" onClick={onDeleteCategory}>Eliminar</button>
        </div>
      )}

      {grupos.length > 0 && (
        <div className="category-detail__grupos">
          <span className="category-detail__expenses-title">Grupos</span>
          <div className="category-detail__grupos-lista">
            <button
              type="button"
              className={`category-detail__grupo-chip ${!grupoActivo ? 'category-detail__grupo-chip--activo' : ''}`}
              onClick={() => {
                setGrupoActivo(null);
                setExpenseLimit(4);
              }}
            >
              Todos
            </button>
            {grupos.map((g) => (
              <button
                key={g.nombre}
                type="button"
                className={`category-detail__grupo-chip ${grupoActivo === g.nombre ? 'category-detail__grupo-chip--activo' : ''}`}
                onClick={() => {
                  setGrupoActivo((actual) => (actual === g.nombre ? null : g.nombre));
                  setExpenseLimit(4);
                }}
              >
                {g.nombre} · <Amount value={g.total} /> ({g.cantidad})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="category-detail__expenses">
        <span className="category-detail__expenses-title">
          {grupoActivo ? `Gastos de "${grupoActivo}"` : 'Gastos de esta categoría'}
        </span>
        {expensesFiltrados.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay gastos en esta categoría.</p>
        ) : (
          <>
            <div className="expense-list">
              {gastosVisibles.map((exp) => (
                <ExpenseCard key={exp.id} expense={exp} onEdit={onEditExpense} onDelete={onDeleteExpense} />
              ))}
            </div>
            {hayMasGastos && (
              <button
                type="button"
                className="category-detail__show-more"
                onClick={() => setExpenseLimit((n) => n + 4)}
              >
                Ver 4 más
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
  onEditFundingEtiqueta,
  plan,
  semana,
  nombreCategoriaSobrante,
  onActivarPresupuesto,
  onApagarPresupuesto,
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
  // Cada grupo suma lo gastado (gastos) y lo ingresado (aportes con el mismo
  // nombre), y de ahí sale la ganancia: ingresado - gastado. Es solo para ver
  // resultados, no cambia el saldo.
  const grupos = useMemo(() => {
    const porNombre = new Map();
    const get = (nombre) =>
      porNombre.get(nombre) || { nombre, gastado: 0, ingresado: 0, cantidad: 0, primeraCompra: null, ultimaVenta: null };
    for (const exp of expensesOrdenados) {
      if (!exp.etiqueta) continue;
      const actual = get(exp.etiqueta);
      actual.gastado += Number(exp.monto);
      actual.cantidad += 1;
      if (!actual.primeraCompra || exp.fecha < actual.primeraCompra) actual.primeraCompra = exp.fecha;
      porNombre.set(exp.etiqueta, actual);
    }
    for (const f of fundingsDeCategoria) {
      if (!f.etiqueta) continue;
      const actual = get(f.etiqueta);
      actual.ingresado += Number(f.monto);
      if (!actual.ultimaVenta || f.fecha > actual.ultimaVenta) actual.ultimaVenta = f.fecha;
      porNombre.set(f.etiqueta, actual);
    }
    return [...porNombre.values()].sort((a, b) => b.gastado + b.ingresado - (a.gastado + a.ingresado));
  }, [expensesOrdenados, fundingsDeCategoria]);

  // Rentabilidad: solo grupos que ya tienen compras (gastos) y ventas (ingresos).
  // Los días van desde la primera compra hasta la última venta del grupo.
  const diasEntre = (a, b) =>
    Math.max(0, Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000));
  const rentabilidad = grupos
    .filter((g) => g.gastado > 0 && g.ingresado > 0)
    .map((g) => ({
      ...g,
      ganancia: g.ingresado - g.gastado,
      margen: ((g.ingresado - g.gastado) / g.gastado) * 100,
      dias: g.primeraCompra && g.ultimaVenta ? diasEntre(g.primeraCompra, g.ultimaVenta) : null,
    }))
    .sort((a, b) => b.ganancia - a.ganancia);
  const gananciaTotal = rentabilidad.reduce((s, g) => s + g.ganancia, 0);
  const gastadoVendidos = rentabilidad.reduce((s, g) => s + g.gastado, 0);
  const sinVender = grupos.filter((g) => g.gastado > 0 && g.ingresado === 0).map((g) => g.nombre);

  const grupoSeleccionado = grupos.find((g) => g.nombre === grupoActivo) || null;

  const expensesFiltrados = grupoActivo
    ? expensesOrdenados.filter((exp) => exp.etiqueta === grupoActivo)
    : expensesOrdenados;
  const gastosVisibles = expensesFiltrados.slice(0, expenseLimit);
  const hayMasGastos = expensesFiltrados.length > expenseLimit;

  const fundingsFiltrados = grupoActivo
    ? fundingsDeCategoria.filter((f) => f.etiqueta === grupoActivo)
    : fundingsDeCategoria;
  const fundingsVisibles = fundingsFiltrados.slice(0, fundingLimit);
  const hayMasFundings = fundingsFiltrados.length > fundingLimit;

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

      <div className="category-detail__grupos">
        <span className="category-detail__expenses-title">Presupuesto semanal</span>
        {plan && semana?.estado === 'activo' ? (
          <>
            <div className="category-detail__stats">
              <span>Esta semana: <strong><Amount value={semana.disponible} /></strong></span>
              <span>Semana: <strong>{semana.semanaActual} de {semana.totalSemanas}</strong></span>
              <span>Por semana: <strong><Amount value={semana.monto} /></strong></span>
            </div>
            {semana.aportes > 0 && (
              <p className="dashboard__empty">
                Incluye <Amount value={semana.aportes} /> que agregaste esta semana.
              </p>
            )}
            {semana.deuda > 0 && (
              <p className="dashboard__empty">
                Arrastras <Amount value={semana.deuda} /> de la semana anterior (ya descontado arriba).
              </p>
            )}
            <p className="dashboard__empty">
              {nombreCategoriaSobrante
                ? `El sobrante de cada semana se mueve a ${nombreCategoriaSobrante}.`
                : 'El sobrante de cada semana se queda en esta categoría.'}
            </p>
            <button type="button" className="category-detail__show-more" onClick={() => onApagarPresupuesto(plan)}>
              Apagar presupuesto semanal
            </button>
          </>
        ) : plan && semana?.estado === 'pendiente' ? (
          <>
            <p className="dashboard__empty">Parte el {semana.inicio}.</p>
            <button type="button" className="category-detail__show-more" onClick={() => onApagarPresupuesto(plan)}>
              Cancelar presupuesto semanal
            </button>
          </>
        ) : (
          <button type="button" className="category-detail__show-more" onClick={onActivarPresupuesto}>
            Activar presupuesto semanal
          </button>
        )}
      </div>

      <div className="category-detail__actions">
        <button type="button" onClick={onAddExpense}>+ Gasto</button>
        <button type="button" onClick={onAddFunds}>+ Agregar plata</button>
        <button type="button" onClick={onOpenTransfer}>Mover plata</button>
      </div>

      <div className="category-detail__fundings">
        <span className="category-detail__expenses-title">Aportes recibidos</span>
        {fundingsFiltrados.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay aportes en {grupoActivo ? 'este grupo' : 'esta categoría'}.</p>
        ) : (
          <>
            <FundingHistory
              fundings={fundingsVisibles}
              onUndo={onUndoFunding}
              onDeleteIncome={onDeleteIncome}
              onEditEtiqueta={onEditFundingEtiqueta}
              etiquetasSugeridas={grupos.map((g) => g.nombre)}
            />
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
                {g.nombre} · <Amount value={g.gastado} /> ({g.cantidad})
              </button>
            ))}
          </div>
          {grupoSeleccionado && (
            <div className="category-detail__stats">
              <span>Gastado: <strong><Amount value={grupoSeleccionado.gastado} /></strong></span>
              <span>Ingresado: <strong><Amount value={grupoSeleccionado.ingresado} /></strong></span>
              <span>Ganancia: <strong><Amount value={grupoSeleccionado.ingresado - grupoSeleccionado.gastado} /></strong></span>
            </div>
          )}
        </div>
      )}

      {rentabilidad.length > 0 && (
        <div className="category-detail__grupos">
          <span className="category-detail__expenses-title">Rentabilidad por grupo</span>
          <div className="category-detail__stats">
            <span>Ganancia total: <strong><Amount value={gananciaTotal} /></strong></span>
            <span>Margen: <strong>{Math.round((gananciaTotal / gastadoVendidos) * 100)}%</strong></span>
          </div>
          {rentabilidad.map((g, i) => (
            <p key={g.nombre} className="dashboard__empty">
              <strong>{i + 1}. {g.nombre}</strong>: <Amount value={g.ganancia} /> ({Math.round(g.margen)}%)
              {g.dias !== null && ` · ${g.dias === 1 ? '1 día' : `${g.dias} días`} de la compra a la última venta`}
            </p>
          ))}
          {sinVender.length > 0 && (
            <p className="dashboard__empty">Sin vender aún: {sinVender.join(', ')}.</p>
          )}
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

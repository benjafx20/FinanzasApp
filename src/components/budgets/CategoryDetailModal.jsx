import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import { ExpenseCard } from '../expenses/ExpenseCard';
import { FundingHistory } from './FundingHistory';
import './CategoryDetailModal.css';

// `asignado`: total que le has metido a esta categoría (tu presupuesto real
// para ella). `saldo`: lo que te queda (asignado - gastado).
// `gastadoSemana` / `gastadoMes`: solo informativos.
// Sección plegable: el detalle de una categoría tiene mucha información, así que todo
// arranca cerrado (con un resumen en el título) y se abre solo lo que se necesita.
function Seccion({ titulo, resumen, abierta, onToggle, children }) {
  return (
    <div className="category-detail__grupos">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '4px 0',
          color: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'left',
        }}
      >
        <span>
          {titulo}
          {resumen ? <span style={{ fontWeight: 400, opacity: 0.7 }}> · {resumen}</span> : null}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: abierta ? 'rotate(180deg)' : 'none' }} />
      </button>
      {abierta && children}
    </div>
  );
}

export function CategoryDetailModal({
  category,
  asignado,
  saldo,
  gastadoSemana,
  gastadoMes,
  fundingsDeCategoria,
  onUndoFunding,
  onDeleteIncome,
  onEditFunding,
  plan,
  semana,
  nombreCategoriaSobrante,
  onActivarPresupuesto,
  onRenameGroup,
  esInventario,
  equipos = [],
  descartados = [],
  onMarcarEquipo,
  onToggleInventario,
  onEditarPresupuesto,
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
      porNombre.get(nombre) || { nombre, gastado: 0, ingresado: 0, cantidad: 0 };
    for (const exp of expensesOrdenados) {
      if (!exp.etiqueta) continue;
      const actual = get(exp.etiqueta);
      actual.gastado += Number(exp.monto);
      actual.cantidad += 1;
      porNombre.set(exp.etiqueta, actual);
    }
    for (const f of fundingsDeCategoria) {
      if (!f.etiqueta) continue;
      const actual = get(f.etiqueta);
      actual.ingresado += Number(f.monto);
      porNombre.set(f.etiqueta, actual);
    }
    return [...porNombre.values()].sort((a, b) => b.gastado + b.ingresado - (a.gastado + a.ingresado));
  }, [expensesOrdenados, fundingsDeCategoria]);

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

  const [abiertas, setAbiertas] = useState({});
  const alternar = (clave) => setAbiertas((p) => ({ ...p, [clave]: !p[clave] }));
  const abrir = (clave) => setAbiertas((p) => ({ ...p, [clave]: true }));
  const plataParada = equipos.reduce((sum, e) => sum + e.costo, 0);
  const plataPerdida = descartados.filter((e) => e.estado === 'perdida').reduce((sum, e) => sum + e.costo, 0);
  const nombreEstado = { repuesto: 'Para repuestos', perdida: 'Dado por pérdida' };
  const filaEquipo = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13 };

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

      <Seccion
        titulo="Inventario de equipos"
        resumen={esInventario ? `${equipos.length} sin vender` : 'desactivado'}
        abierta={!!abiertas.inventario}
        onToggle={() => alternar('inventario')}
      >
        {esInventario ? (
          <>
            {equipos.length === 0 ? (
              <p className="dashboard__empty">No tienes equipos sin vender.</p>
            ) : (
              <>
                <div className="category-detail__stats">
                  <span>Sin vender: <strong>{equipos.length}</strong></span>
                  <span>Plata parada: <strong><Amount value={plataParada} /></strong></span>
                </div>
                {equipos.map((e) => (
                  <div key={e.nombre} style={filaEquipo}>
                    <span>
                      <strong>{e.nombre}</strong>: <Amount value={e.costo} /> · {e.dias === 1 ? '1 día' : `${e.dias} días`}
                      {e.atrasado ? ' ⚠' : ''}
                    </span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="category-detail__show-more" onClick={() => onMarcarEquipo(e.nombre, 'repuesto')}>
                        Para repuestos
                      </button>
                      <button type="button" className="category-detail__show-more" onClick={() => onMarcarEquipo(e.nombre, 'perdida')}>
                        Pérdida
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}
            {descartados.length > 0 && (
              <>
                <p className="dashboard__empty">
                  <strong>Ya no se venden ({descartados.length})</strong>
                  {plataPerdida > 0 && <> · pérdida: <Amount value={plataPerdida} /></>}
                </p>
                {descartados.map((e) => (
                  <div key={e.nombre} style={filaEquipo}>
                    <span>
                      <strong>{e.nombre}</strong> · {nombreEstado[e.estado]} · <Amount value={e.costo} />
                    </span>
                    <button type="button" className="category-detail__show-more" onClick={() => onMarcarEquipo(e.nombre, null)}>
                      Volver a inventario
                    </button>
                  </div>
                ))}
              </>
            )}
            <button type="button" className="category-detail__show-more" onClick={() => onToggleInventario(false)}>
              Quitar de inventario
            </button>
          </>
        ) : (
          <button type="button" className="category-detail__show-more" onClick={() => onToggleInventario(true)}>
            Usar como inventario (equipos comprados y sin vender)
          </button>
        )}
      </Seccion>

      <Seccion
        titulo="Presupuesto semanal"
        resumen={plan && semana?.estado === 'activo' ? <>esta semana <Amount value={semana.disponible} /></> : 'sin activar'}
        abierta={!!abiertas.presupuesto}
        onToggle={() => alternar('presupuesto')}
      >
        {plan && semana?.estado === 'activo' ? (
          <>
            <div className="category-detail__stats">
              <span>Esta semana: <strong><Amount value={semana.disponible} /></strong></span>
              <span>Semana: <strong>{semana.semanaActual} de {semana.totalSemanas}</strong></span>
              <span>Por semana: <strong><Amount value={semana.monto} /></strong></span>
            </div>
            {semana.limitadoPorSaldo && (
              <p className="dashboard__empty">
                Ojo: te tocarían <Amount value={semana.disponibleSinTope} /> esta semana, pero la categoría solo tiene{' '}
                <Amount value={semana.disponible} />.
              </p>
            )}
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
            <button type="button" className="category-detail__show-more" onClick={() => onEditarPresupuesto(plan)}>
              Editar presupuesto semanal
            </button>
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
      </Seccion>

      {grupos.length > 0 && (
        <Seccion titulo="Grupos" resumen={`${grupos.length}`} abierta={!!abiertas.grupos} onToggle={() => alternar('grupos')}>
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
                  abrir('gastos');
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
          {grupoSeleccionado && onRenameGroup && (
            <button
              type="button"
              className="category-detail__show-more"
              onClick={async () => {
                const nuevo = await onRenameGroup(grupoSeleccionado.nombre);
                if (nuevo) setGrupoActivo(nuevo);
              }}
            >
              Cambiar nombre de este grupo
            </button>
          )}
        </Seccion>
      )}

      <Seccion
        titulo={grupoActivo ? `Gastos de "${grupoActivo}"` : 'Gastos'}
        resumen={`${expensesFiltrados.length}`}
        abierta={!!abiertas.gastos}
        onToggle={() => alternar('gastos')}
      >
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
              <button type="button" className="category-detail__show-more" onClick={() => setExpenseLimit((n) => n + 4)}>
                Ver 4 más
              </button>
            )}
          </>
        )}
      </Seccion>

      <Seccion
        titulo="Aportes recibidos"
        resumen={`${fundingsFiltrados.length}`}
        abierta={!!abiertas.aportes}
        onToggle={() => alternar('aportes')}
      >
        {fundingsFiltrados.length === 0 ? (
          <p className="dashboard__empty">Todavía no hay aportes en {grupoActivo ? 'este grupo' : 'esta categoría'}.</p>
        ) : (
          <>
            <FundingHistory
              fundings={fundingsVisibles}
              onUndo={onUndoFunding}
              onDeleteIncome={onDeleteIncome}
              onEdit={onEditFunding}
            />
            {hayMasFundings && (
              <button type="button" className="category-detail__show-more" onClick={() => setFundingLimit((n) => n + 4)}>
                Ver 4 más
              </button>
            )}
          </>
        )}
      </Seccion>

      {category.user_id && (
        <div className="category-detail__manage">
          <button type="button" onClick={onEditCategory}>Editar categoría</button>
          <button type="button" className="category-detail__delete" onClick={onDeleteCategory}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

import { lazy, Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useExpenses } from '../hooks/useExpenses';
import { useBudgetTransfers } from '../hooks/useBudgetTransfers';
import { useCategoryFundings } from '../hooks/useCategoryFundings';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useIncomes } from '../hooks/useIncomes';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
import { useDebts } from '../hooks/useDebts';
import { Header } from '../components/layout/Header';
import { BudgetCard } from '../components/budgets/BudgetCard';
import { TransferForm } from '../components/budgets/TransferForm';
import { TransferHistory } from '../components/budgets/TransferHistory';
import { AddFundingForm } from '../components/budgets/AddFundingForm';
import { CategoryDetailModal } from '../components/budgets/CategoryDetailModal';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExpenseCalendar } from '../components/expenses/ExpenseCalendar';
const MonthlyTrendChart = lazy(() =>
  import('../components/expenses/MonthlyTrendChart').then((m) => ({ default: m.MonthlyTrendChart }))
);
const CategoryPieChart = lazy(() =>
  import('../components/expenses/CategoryPieChart').then((m) => ({ default: m.CategoryPieChart }))
);
import { RecurringExpenseForm } from '../components/expenses/RecurringExpenseForm';
import { RecurringExpenseRow } from '../components/expenses/RecurringExpenseRow';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { ContributionForm } from '../components/goals/ContributionForm';
import { IncomeForm } from '../components/income/IncomeForm';
import { CategoryForm } from '../components/categories/CategoryForm';
import { ManageCategoriesModal } from '../components/categories/ManageCategoriesModal';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { useOnboarding } from '../hooks/useOnboarding';
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { Modal } from '../components/ui/Modal';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { MonthlySummaryModal } from '../components/summary/MonthlySummaryModal';
import { getClosedMonths } from '../utils/monthlySummary';
import { DebtsSection } from '../components/debts/DebtsSection';
import { DebtForm } from '../components/debts/DebtForm';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { AssistantModal } from '../components/assistant/AssistantModal';
import { buildFinancialContext } from '../utils/buildFinancialContext';
import {
  getCurrentMonthKey,
  getWeekRange,
  isInRange,
  isInMonth,
} from '../utils/dateHelpers';
import './Dashboard.css';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const isOnline = useOnlineStatus();
  const categoriesHook = useCategories(user?.id);
  const { categories, allCategories, error: catError } = categoriesHook;

  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [newRecordType, setNewRecordType] = useState('expense'); // 'expense' | 'income'
  const [presetExpenseCategoryId, setPresetExpenseCategoryId] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [contributingGoal, setContributingGoal] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [transferFromCategory, setTransferFromCategory] = useState(null);
  const [fundingCategory, setFundingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [editingCategoryDirect, setEditingCategoryDirect] = useState(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [summaryModal, setSummaryModal] = useState(null); // null | { initialMonthKey }
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace('#', '');
    return ['overview', 'savings', 'debts', 'calendar'].includes(hash)
      ? hash
      : 'overview';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${activeSection}`);
    }
  }, [activeSection]);

  const monthKey = getCurrentMonthKey();

  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: refetchExpenses,
    syncPendingExpenses,
  } = useExpenses(user?.id);
  const {
    transfers,
    addTransfer,
    deleteTransfer,
    netoPorCategoria,
    refetch: refetchTransfers,
  } = useBudgetTransfers(user?.id);
  const {
    fundings,
    addManualFunding,
    addIncomeFundings,
    deleteFunding,
    totalPorCategoria,
    refetch: refetchFundings,
  } = useCategoryFundings(user?.id);
  const {
    goals,
    contributions: savingsContributions,
    error: goalsError,
    addGoal,
    deleteGoal,
    addContribution,
    totalByGoal,
    refetch: refetchGoals,
  } = useSavingsGoals(user?.id);
  const {
    debts,
    error: debtsError,
    addDebt,
    markAsPaid: markDebtAsPaid,
    deleteDebt,
    refetch: refetchDebts,
  } = useDebts(user?.id);
  const {
    incomes,
    addIncome,
    updateIncome,
    deleteIncome,
    refetch: refetchIncomes,
  } = useIncomes(user?.id);
  const {
    recurring,
    error: recurringError,
    addRecurring,
    toggleActivo,
    deleteRecurring,
    refetch: refetchRecurring,
  } = useRecurringExpenses(user?.id);
  const { show: showOnboarding, finish: finishOnboarding, replay: replayOnboarding } = useOnboarding(user?.id);

  // Si la app estuvo en segundo plano y la sesión quedó vencida, al volver
  // se refresca la sesión y se vuelven a pedir todos los datos.
  useRefetchOnFocus([
    refetchExpenses,
    syncPendingExpenses,
    refetchTransfers,
    refetchFundings,
    refetchGoals,
    refetchIncomes,
    refetchRecurring,
    refetchDebts,
    categoriesHook.refetch,
  ]);

  // Gasto atribuido a cada categoría para MOSTRAR (semana/mes), siempre
  // según `category_id` — es decir, "dónde se usó la plata", sin importar
  // si se financió con el saldo de otra categoría.
  const { totalMes, totalSemana, gastoSemanaPorCategoria, gastoMesPorCategoria } = useMemo(() => {
    const { start, end } = getWeekRange();
    let totalMes = 0;
    let totalSemana = 0;
    const gastoSemanaPorCategoria = {};
    const gastoMesPorCategoria = {};

    for (const exp of expenses) {
      const cat = exp.category_id;
      if (cat && isInMonth(exp.fecha, monthKey)) {
        gastoMesPorCategoria[cat] = (gastoMesPorCategoria[cat] || 0) + Number(exp.monto);
      }
      if (cat && isInRange(exp.fecha, start, end)) {
        gastoSemanaPorCategoria[cat] = (gastoSemanaPorCategoria[cat] || 0) + Number(exp.monto);
      }
      if (isInMonth(exp.fecha, monthKey)) totalMes += Number(exp.monto);
      if (isInRange(exp.fecha, start, end)) totalSemana += Number(exp.monto);
    }
    return { totalMes, totalSemana, gastoSemanaPorCategoria, gastoMesPorCategoria };
  }, [expenses, monthKey]);


  // Gasto que realmente le baja el SALDO a cada categoría: el de su propia
  // plata (funding_category_id vacío) o el que financió para otra
  // categoría (funding_category_id = esta categoría).
  const gastoParaSaldoPorCategoria = useMemo(() => {
    const map = {};
    for (const exp of expenses) {
      const origenSaldo = exp.funding_category_id || exp.category_id;
      if (!origenSaldo) continue;
      map[origenSaldo] = (map[origenSaldo] || 0) + Number(exp.monto);
    }
    return map;
  }, [expenses]);

  const totalFundingsPorCategoria = useMemo(() => totalPorCategoria(), [totalPorCategoria]);
  const netoTransferenciasPorCategoria = useMemo(() => netoPorCategoria(), [netoPorCategoria]);

  // El saldo real: nunca se resetea solo, sube con aportes/traspasos
  // entrantes, baja con traspasos salientes y gastos reales.
  const { asignadoPorCategoria, saldoPorCategoria } = useMemo(() => {
    const asignadoPorCategoria = {};
    const saldoPorCategoria = {};
    for (const cat of allCategories) {
      const aportes = totalFundingsPorCategoria[cat.id] || 0;
      const neto = netoTransferenciasPorCategoria[cat.id] || 0;
      const gastado = gastoParaSaldoPorCategoria[cat.id] || 0;
      asignadoPorCategoria[cat.id] = aportes + neto;
      saldoPorCategoria[cat.id] = aportes + neto - gastado;
    }
    return { asignadoPorCategoria, saldoPorCategoria };
  }, [allCategories, totalFundingsPorCategoria, netoTransferenciasPorCategoria, gastoParaSaldoPorCategoria]);

  // Balance TOTAL (no del mes): cuánta plata deberías tener en total en
  // este momento, sumando el saldo real de todas las categorías. A
  // diferencia de un balance mensual (ingresos del mes - gastos del mes),
  // este no se reinicia cada mes ni depende de en qué día cae el corte.
  const balanceTotal = useMemo(
    () => Object.values(saldoPorCategoria).reduce((sum, s) => sum + s, 0),
    [saldoPorCategoria]
  );

  const financialContext = useMemo(
    () => buildFinancialContext({
      expenses,
      incomes,
      categories: allCategories,
      saldoPorCategoria,
      asignadoPorCategoria,
      debts,
      goals,
      totalByGoal,
      balanceTotal,
      monthKey,
    }),
    [expenses, incomes, allCategories, saldoPorCategoria, asignadoPorCategoria, debts, goals, totalByGoal, balanceTotal, monthKey]
  );

  const closedMonths = useMemo(
    () => getClosedMonths({ expenses, fundings, transfers, contributions: savingsContributions, debts }, monthKey),
    [expenses, fundings, transfers, savingsContributions, debts, monthKey]
  );

  // Al abrir la app en un mes nuevo, muestra una sola vez el resumen del
  // mes recién cerrado. Se guarda en localStorage cuál fue el último que
  // ya se mostró, para no insistir cada vez que se abre la app.
  useEffect(() => {
    if (closedMonths.length === 0) return;
    const ultimoMes = closedMonths[0];
    let yaVisto = null;
    try {
      yaVisto = localStorage.getItem('finanzas_resumen_mes_visto');
    } catch {
      // Sin localStorage, simplemente no se auto-muestra; sigue disponible
      // a mano desde el botón de resumen mensual.
    }
    if (yaVisto !== ultimoMes) {
      setSummaryModal({ initialMonthKey: ultimoMes });
      try {
        localStorage.setItem('finanzas_resumen_mes_visto', ultimoMes);
      } catch {
        // Idem — si falla, se podría volver a mostrar la próxima vez, no
        // es grave.
      }
    }
    // Solo debe correr cuando cambia la lista de meses cerrados (ej: al
    // cargar los datos por primera vez), no cada vez que se re-renderiza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedMonths]);

  const expensesDeCategoriaEnDetalle = useMemo(() => {
    if (!viewingCategory) return [];
    return expenses.filter((e) => e.category_id === viewingCategory.id);
  }, [expenses, viewingCategory]);

  const fundingsDeCategoriaEnDetalle = useMemo(() => {
    if (!viewingCategory) return [];
    return fundings.filter((f) => f.category_id === viewingCategory.id);
  }, [fundings, viewingCategory]);

  const categoryManagement = {
    allCategories,
    addCategory: categoriesHook.addCategory,
    updateCategory: categoriesHook.updateCategory,
    moveCategory: categoriesHook.moveCategory,
    setHidden: categoriesHook.setHidden,
    checkCategoryUsage: categoriesHook.checkCategoryUsage,
    deleteCategory: categoriesHook.deleteCategory,
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
    } catch (err) {
      alert(err.message);
    }
  };


  const handleDeleteGoal = async (id) => {
    if (!confirm('¿Eliminar esta meta? Se perderá el historial de aportes.')) return;
    try {
      await deleteGoal(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMarkDebtPaid = async (id) => {
    try {
      await markDebtAsPaid(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDebt = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await deleteDebt(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (!confirm('¿Eliminar este gasto recurrente? No se borrarán los gastos ya generados.')) return;
    try {
      await deleteRecurring(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndoTransfer = async (id) => {
    if (!confirm('¿Deshacer este movimiento entre categorías?')) return;
    try {
      await deleteTransfer(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndoFunding = async (id) => {
    if (!confirm('¿Deshacer este aporte? Bajará el saldo de la categoría.')) return;
    try {
      await deleteFunding(id);
    } catch (err) {
      alert(err.message);
    }
  };

  // Elimina el ingreso completo (no solo el aporte a esta categoría). Si el
  // ingreso se repartió en varias categorías, primero borra todos esos
  // aportes para que no quede plata "fantasma" en otra categoría antes de
  // borrar el ingreso en sí.
  const handleDeleteIncomeFromDetail = async (incomeId) => {
    if (!confirm('¿Eliminar este ingreso? Se quitará también de todas las categorías en las que se repartió.')) return;
    try {
      const fundingsDelIngreso = fundings.filter((f) => f.income_id === incomeId);
      for (const f of fundingsDelIngreso) {
        await deleteFunding(f.id);
      }
      await deleteIncome(incomeId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCategoryFromDetail = async (cat) => {
    if (!cat.user_id) {
      alert('Las categorías predefinidas no se pueden eliminar — puedes ocultarlas desde "Editar categorías".');
      return;
    }
    const usage = await categoriesHook.checkCategoryUsage(cat.id);
    const total = usage.gastos + usage.recurrentes;
    const mensaje = total > 0
      ? `"${cat.nombre}" tiene ${usage.gastos} gasto(s) y ${usage.recurrentes} gasto(s) recurrente(s) asociados.\n\nNo se borrará ningún gasto, pero perderán la categoría asignada (quedarán marcados como "Sin categoría").\n\n¿Quieres continuar?`
      : `¿Eliminar la categoría "${cat.nombre}"?`;
    if (!window.confirm(mensaje)) return;
    try {
      await categoriesHook.deleteCategory(cat.id);
      setViewingCategory(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // Registra el ingreso y, si se repartió entre categorías, crea los
  // aportes correspondientes de una vez.
  const handleAddIncome = async (values, repartoArray) => {
    const nuevoIngreso = await addIncome(values);
    if (repartoArray.length > 0) {
      await addIncomeFundings(nuevoIngreso.id, repartoArray);
    }
    return nuevoIngreso;
  };

  // "+ Agregar plata" a una categoría es plata NUEVA (vendiste algo, etc.).
  // No se crea un ingreso aparte para no duplicar datos entre dos tablas
  // (el saldo real de la categoría ya suma este tipo de aporte).
  const handleAddFunding = addManualFunding;

  const closeNewRecordModal = useCallback(() => {
    setShowNewRecordModal(false);
    setNewRecordType('expense');
    setPresetExpenseCategoryId(null);
  }, []);

  return (
    <div className="dashboard">
      <Header
        totalMes={totalMes}
        totalSemana={totalSemana}
        balance={balanceTotal}
        onSignOut={signOut}
        onShowHelp={replayOnboarding}
        onShowSearch={() => setShowSearchModal(true)}
      />

      {!isOnline && <OfflineBanner />}

      {showOnboarding && <OnboardingModal onFinish={finishOnboarding} />}

      <nav className="dashboard__nav" aria-label="Secciones de la app">
        {[
          {
            id: 'overview',
            label: 'Inicio',
            order: 1,
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3.5 10.5 12 3.5l8.5 7v9.5h-5.7v-6.3H9.2v6.3H3.5z" />
              </svg>
            ),
          },
          {
            id: 'savings',
            label: 'Ahorro',
            order: 2,
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 18.5h10a2.5 2.5 0 0 0 2.5-2.5V9.8A2.3 2.3 0 0 0 17.2 7.5h-1.1a3 3 0 0 1-2.1-1.1L12.5 4.6a2.8 2.8 0 0 0-2.1-1.1H8.8A2.3 2.3 0 0 0 6.5 5.8V16a2.5 2.5 0 0 0 2.5 2.5Z" />
                <path d="M9 12.5h6M12 9.5v6" />
              </svg>
            ),
          },
          {
            id: 'assistant',
            label: 'IA',
            order: 3,
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.8a3.6 3.6 0 0 1 3.2 2.1 3.4 3.4 0 0 1 3.6 2.8 3.5 3.5 0 0 1-1.3 2.8 3.3 3.3 0 0 1 .4 1.7 3.5 3.5 0 0 1-2.2 3.2A3.5 3.5 0 0 1 12 20.6a3.5 3.5 0 0 1-3.7-2.5 3.5 3.5 0 0 1-2.2-3.2 3.3 3.3 0 0 1 .4-1.7 3.5 3.5 0 0 1-1.3-2.8A3.4 3.4 0 0 1 8.8 4.9 3.6 3.6 0 0 1 12 2.8Z" />
                <path d="M9.2 12h5.6M12 8.8v6.4" />
              </svg>
            ),
            onClick: () => setShowAssistant(true),
          },
          {
            id: 'add',
            label: 'Agregar',
            order: 4,
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            ),
            isPrimary: true,
            onClick: () => setShowNewRecordModal(true),
          },
          {
            id: 'debts',
            label: 'Prést.',
            order: 5,
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
                <path d="M3.5 10.5h17M7.5 16.5h3" />
              </svg>
            ),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`dashboard__nav-button ${tab.isPrimary ? 'dashboard__nav-button--primary' : ''} ${activeSection === tab.id ? 'dashboard__nav-button--active' : ''}`}
            style={{ order: tab.order }}
            onClick={tab.onClick || (() => setActiveSection(tab.id))}
            title={tab.label}
            aria-label={tab.label}
          >
            <span className="dashboard__nav-button-icon" aria-hidden="true">{tab.icon}</span>
            <span className="dashboard__nav-button-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="dashboard__content">
        {activeSection === 'overview' && (
          <>
            <section className="dashboard__section dashboard__section--wide">
              <div className="dashboard__section-header">
                <h2 className="dashboard__section-title">Categorías</h2>
                <button className="dashboard__add-link" onClick={() => setShowManageCategories(true)}>
                  Editar
                </button>
              </div>

              {catError && <p className="dashboard__error">{catError}</p>}
              <div className="budget-scroll">
                {categories.map((cat) => (
                  <BudgetCard
                    key={cat.id}
                    category={cat}
                    asignado={asignadoPorCategoria[cat.id] || 0}
                    saldo={saldoPorCategoria[cat.id] || 0}
                    gastadoSemana={gastoSemanaPorCategoria[cat.id] || 0}
                    gastadoMes={gastoMesPorCategoria[cat.id] || 0}
                    onOpenDetail={() => setViewingCategory(cat)}
                    onAddExpense={() => {
                      setPresetExpenseCategoryId(cat.id);
                      setNewRecordType('expense');
                      setShowNewRecordModal(true);
                    }}
                    onAddFunds={() => {
                      setFundingCategory(cat);
                    }}
                    onOpenTransfer={() => {
                      setTransferFromCategory(cat);
                    }}
                  />
                ))}
              </div>

              {transfers.length > 0 && (
                <div className="dashboard__transfers">
                  <span className="dashboard__transfers-title">Movimientos entre categorías</span>
                  <TransferHistory transfers={transfers} onUndo={handleUndoTransfer} />
                </div>
              )}
            </section>

            <div className="dashboard__row">
              <section className="dashboard__section dashboard__section--half">
                <div className="dashboard__section-header">
                  <h2 className="dashboard__section-title">Tendencia (últimos 6 meses)</h2>
                  <button
                    className="dashboard__add-link"
                    onClick={() => setSummaryModal({ initialMonthKey: closedMonths[0] || null })}
                  >
                    📅 Resumen
                  </button>
                </div>
                <Suspense fallback={<div className="trend-chart-skeleton" />}>
                  <MonthlyTrendChart expenses={expenses} />
                </Suspense>
              </section>

              <section className="dashboard__section dashboard__section--half">
                <h2 className="dashboard__section-title">Gasto por categoría este mes</h2>
                <Suspense fallback={<div className="trend-chart-skeleton" />}>
                  <CategoryPieChart expenses={expenses} categories={allCategories} monthKey={monthKey} />
                </Suspense>
              </section>
            </div>
          </>
        )}

        {activeSection === 'savings' && (
          <div className="dashboard__row">
            <section className="dashboard__section dashboard__section--half">
              <div className="dashboard__section-header">
                <h2 className="dashboard__section-title">Metas de ahorro</h2>
                <button className="dashboard__add-link" onClick={() => setShowGoalModal(true)}>+ Nueva</button>
              </div>
              {goalsError && <p className="dashboard__error">{goalsError}</p>}
              {goals.length === 0 ? (
                <p className="dashboard__empty">Sin metas todavía. Crea una para empezar a ahorrar.</p>
              ) : (
                <div className="budget-scroll budget-scroll--compact">
                  {goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      acumulado={totalByGoal(goal.id)}
                      onAportar={() => setContributingGoal(goal)}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard__section dashboard__section--half">
              <div className="dashboard__section-header">
                <h2 className="dashboard__section-title">Gastos recurrentes</h2>
                <button className="dashboard__add-link" onClick={() => setShowRecurringModal(true)}>+ Nuevo</button>
              </div>
              {recurringError && <p className="dashboard__error">{recurringError}</p>}
              {recurring.length === 0 ? (
                <p className="dashboard__empty">Sin gastos recurrentes. Agrega arriendo, suscripciones, etc.</p>
              ) : (
                <div className="recurring-list">
                  {recurring.map((r) => (
                    <RecurringExpenseRow
                      key={r.id}
                      recurring={r}
                      onToggle={toggleActivo}
                      onDelete={handleDeleteRecurring}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeSection === 'debts' && (
          <section className="dashboard__section dashboard__section--wide">
            <div className="dashboard__section-header">
              <h2 className="dashboard__section-title">Deudas y préstamos</h2>
              <button className="dashboard__add-link" onClick={() => setShowDebtModal(true)}>+ Nueva</button>
            </div>
            {debtsError && <p className="dashboard__error">{debtsError}</p>}
            <DebtsSection debts={debts} onMarkPaid={handleMarkDebtPaid} onDelete={handleDeleteDebt} />
          </section>
        )}

        {activeSection === 'calendar' && (
          <section className="dashboard__section dashboard__section--wide">
            <div className="dashboard__section-header">
              <h2 className="dashboard__section-title">Calendario de gastos</h2>
              <button className="dashboard__add-link" onClick={() => setShowCalendar((v) => !v)}>
                {showCalendar ? 'Ocultar' : 'Ver calendario'}
              </button>
            </div>
            {showCalendar && (
              <ExpenseCalendar expenses={expenses} onEdit={setEditingExpense} onDelete={handleDelete} />
            )}
          </section>
        )}
      </main>

      <Modal open={showNewRecordModal} onClose={closeNewRecordModal} title="Nuevo registro">
        <SegmentedControl
          options={[
            { value: 'expense', label: 'Gasto' },
            { value: 'income', label: 'Ingreso' },
          ]}
          value={newRecordType}
          onChange={setNewRecordType}
        />
        {newRecordType === 'expense' ? (
          categories.length > 0 && (
            <ExpenseForm
              categories={categories}
              defaultCategoryId={presetExpenseCategoryId}
              saldosPorCategoria={saldoPorCategoria}
              onSubmit={addExpense}
              onDone={closeNewRecordModal}
              categoryManagement={categoryManagement}
            />
          )
        ) : (
          <IncomeForm categories={categories} onSubmit={handleAddIncome} onDone={closeNewRecordModal} />
        )}
      </Modal>

      <Modal open={!!editingExpense} onClose={() => setEditingExpense(null)} title="Editar gasto">
        {editingExpense && (
          <ExpenseForm
            categories={categories}
            expense={editingExpense}
            saldosPorCategoria={saldoPorCategoria}
            onSubmit={(values) => updateExpense(editingExpense.id, values)}
            onDone={() => setEditingExpense(null)}
            categoryManagement={categoryManagement}
          />
        )}
      </Modal>

      <Modal open={!!editingIncome} onClose={() => setEditingIncome(null)} title="Editar ingreso">
        {editingIncome && (
          <IncomeForm
            income={editingIncome}
            onSubmit={(values) => updateIncome(editingIncome.id, values)}
            onDone={() => setEditingIncome(null)}
          />
        )}
      </Modal>

      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title="Nueva meta de ahorro">
        <GoalForm onSubmit={addGoal} onDone={() => setShowGoalModal(false)} />
      </Modal>

      <Modal open={showDebtModal} onClose={() => setShowDebtModal(false)} title="Deuda o préstamo">
        <DebtForm onSubmit={addDebt} onDone={() => setShowDebtModal(false)} />
      </Modal>

      <GlobalSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        expenses={expenses}
        incomes={incomes}
        debts={debts}
        categories={allCategories}
        onSelectExpense={setEditingExpense}
        onSelectIncome={setEditingIncome}
      />

      <AssistantModal
        open={showAssistant}
        onClose={() => setShowAssistant(false)}
        context={financialContext}
      />

      <Modal
        open={!!contributingGoal}
        onClose={() => setContributingGoal(null)}
        title="Registrar aporte"
      >
        {contributingGoal && (
          <ContributionForm
            goal={contributingGoal}
            onSubmit={addContribution}
            onDone={() => setContributingGoal(null)}
          />
        )}
      </Modal>

      <Modal open={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Nuevo gasto recurrente">
        {categories.length > 0 && (
          <RecurringExpenseForm
            categories={categories}
            onSubmit={addRecurring}
            onDone={() => setShowRecurringModal(false)}
            categoryManagement={categoryManagement}
          />
        )}
      </Modal>

      <Modal
        open={!!transferFromCategory}
        onClose={() => setTransferFromCategory(null)}
        title="Mover plata"
      >
        {transferFromCategory && (
          <TransferForm
            fromCategory={transferFromCategory}
            disponibleOrigen={saldoPorCategoria[transferFromCategory.id] || 0}
            categories={categories}
            onSubmit={addTransfer}
            onDone={() => setTransferFromCategory(null)}
          />
        )}
      </Modal>

      <Modal open={!!fundingCategory} onClose={() => setFundingCategory(null)} title="Agregar plata">
        {fundingCategory && (
          <AddFundingForm
            category={fundingCategory}
            onSubmit={handleAddFunding}
            onDone={() => setFundingCategory(null)}
          />
        )}
      </Modal>

      <Modal open={!!viewingCategory} onClose={() => setViewingCategory(null)} title="Detalle de categoría">
        {viewingCategory && (
          <CategoryDetailModal
            category={viewingCategory}
            asignado={asignadoPorCategoria[viewingCategory.id] || 0}
            saldo={saldoPorCategoria[viewingCategory.id] || 0}
            gastadoSemana={gastoSemanaPorCategoria[viewingCategory.id] || 0}
            gastadoMes={gastoMesPorCategoria[viewingCategory.id] || 0}
            fundingsDeCategoria={fundingsDeCategoriaEnDetalle}
            onUndoFunding={handleUndoFunding}
            onDeleteIncome={handleDeleteIncomeFromDetail}
            expensesDeCategoria={expensesDeCategoriaEnDetalle}
            onAddExpense={() => {
              setPresetExpenseCategoryId(viewingCategory.id);
              setNewRecordType('expense');
              setViewingCategory(null);
              setShowNewRecordModal(true);
            }}
            onAddFunds={() => {
              setFundingCategory(viewingCategory);
              setViewingCategory(null);
            }}
            onOpenTransfer={() => {
              setTransferFromCategory(viewingCategory);
              setViewingCategory(null);
            }}
            onEditCategory={() => setEditingCategoryDirect(viewingCategory)}
            onDeleteCategory={() => handleDeleteCategoryFromDetail(viewingCategory)}
            onEditExpense={(exp) => {
              setViewingCategory(null);
              setEditingExpense(exp);
            }}
            onDeleteExpense={handleDelete}
          />
        )}
      </Modal>

      <Modal open={!!editingCategoryDirect} onClose={() => setEditingCategoryDirect(null)} title="Editar categoría">
        {editingCategoryDirect && (
          <CategoryForm
            category={editingCategoryDirect}
            onSubmit={(values) => categoriesHook.updateCategory(editingCategoryDirect.id, values)}
            onDone={() => setEditingCategoryDirect(null)}
          />
        )}
      </Modal>

      <Modal open={showManageCategories} onClose={() => setShowManageCategories(false)} title="Editar categorías">
        <ManageCategoriesModal
          categories={allCategories}
          onMove={categoriesHook.moveCategory}
          onToggleHidden={categoriesHook.setHidden}
          onCheckUsage={categoriesHook.checkCategoryUsage}
          onDelete={categoriesHook.deleteCategory}
          onUpdate={categoriesHook.updateCategory}
          onAdd={categoriesHook.addCategory}
        />
      </Modal>

      <MonthlySummaryModal
        open={!!summaryModal}
        onClose={() => setSummaryModal(null)}
        closedMonths={closedMonths}
        initialMonthKey={summaryModal?.initialMonthKey}
        expenses={expenses}
        fundings={fundings}
        transfers={transfers}
        contributions={savingsContributions}
        debts={debts}
        categories={allCategories}
      />
    </div>
  );
}

import { lazy, Suspense, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useExpenses } from '../hooks/useExpenses';
import { useBudgetTransfers } from '../hooks/useBudgetTransfers';
import { useCategoryFundings } from '../hooks/useCategoryFundings';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useIncomes } from '../hooks/useIncomes';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
import { Header } from '../components/layout/Header';
import { BudgetCard } from '../components/budgets/BudgetCard';
import { TransferForm } from '../components/budgets/TransferForm';
import { TransferHistory } from '../components/budgets/TransferHistory';
import { AddFundingForm } from '../components/budgets/AddFundingForm';
import { CategoryDetailModal } from '../components/budgets/CategoryDetailModal';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { FAB } from '../components/expenses/FAB';
const MonthlyTrendChart = lazy(() =>
  import('../components/expenses/MonthlyTrendChart').then((m) => ({ default: m.MonthlyTrendChart }))
);
import { RecurringExpenseForm } from '../components/expenses/RecurringExpenseForm';
import { RecurringExpenseRow } from '../components/expenses/RecurringExpenseRow';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalForm } from '../components/goals/GoalForm';
import { ContributionForm } from '../components/goals/ContributionForm';
import { IncomeForm } from '../components/income/IncomeForm';
import { IncomeCard } from '../components/income/IncomeCard';
import { CategoryForm } from '../components/categories/CategoryForm';
import { ManageCategoriesModal } from '../components/categories/ManageCategoriesModal';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { useOnboarding } from '../hooks/useOnboarding';
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus';
import { Modal } from '../components/ui/Modal';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import {
  getCurrentMonthKey,
  getWeekRange,
  isInRange,
  isInMonth,
} from '../utils/dateHelpers';
import './Dashboard.css';

export function Dashboard() {
  const { user, signOut } = useAuth();
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

  const monthKey = getCurrentMonthKey();

  const {
    expenses,
    loading: loadingExpenses,
    error: expensesError,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: refetchExpenses,
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
    error: goalsError,
    addGoal,
    deleteGoal,
    addContribution,
    totalByGoal,
    refetch: refetchGoals,
  } = useSavingsGoals(user?.id);
  const {
    incomes,
    error: incomesError,
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
    refetchTransfers,
    refetchFundings,
    refetchGoals,
    refetchIncomes,
    refetchRecurring,
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

  const totalIngresosMes = useMemo(
    () => incomes.filter((i) => isInMonth(i.fecha, monthKey)).reduce((sum, i) => sum + Number(i.monto), 0),
    [incomes, monthKey]
  );

  const balanceMes = totalIngresosMes - totalMes;

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

  const handleDeleteIncome = async (id) => {
    try {
      await deleteIncome(id);
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
        balance={balanceMes}
        onSignOut={signOut}
        onShowHelp={replayOnboarding}
      />

      {showOnboarding && <OnboardingModal onFinish={finishOnboarding} />}

      <main className="dashboard__content">
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">Categorías</h2>
            <button className="dashboard__add-link" onClick={() => setShowManageCategories(true)}>
              Editar categorías
            </button>
          </div>

          {catError && <p className="dashboard__error">{catError}</p>}
          <p className="dashboard__hint">Toca una categoría para ver sus gastos, agregar plata o gastar.</p>
          <div className="budget-scroll">
            {categories.map((cat) => (
              <BudgetCard
                key={cat.id}
                category={cat}
                asignado={asignadoPorCategoria[cat.id] || 0}
                saldo={saldoPorCategoria[cat.id] || 0}
                gastadoSemana={gastoSemanaPorCategoria[cat.id] || 0}
                gastadoMes={gastoMesPorCategoria[cat.id] || 0}
                onEdit={() => setViewingCategory(cat)}
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

        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">Metas de ahorro</h2>
            <button className="dashboard__add-link" onClick={() => setShowGoalModal(true)}>+ Nueva</button>
          </div>
          {goalsError && <p className="dashboard__error">{goalsError}</p>}
          {goals.length === 0 ? (
            <p className="dashboard__empty">Sin metas todavía. Crea una para empezar a ahorrar.</p>
          ) : (
            <div className="budget-scroll">
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

        <section className="dashboard__section">
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

        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Tendencia (últimos 6 meses)</h2>
          <Suspense fallback={<div className="trend-chart-skeleton" />}>
            <MonthlyTrendChart expenses={expenses} />
          </Suspense>
        </section>

        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Ingresos recientes</h2>
          {incomesError && <p className="dashboard__error">{incomesError}</p>}
          {incomes.length === 0 ? (
            <p className="dashboard__empty">Aún no registras ingresos.</p>
          ) : (
            <div className="expense-list">
              {incomes.slice(0, 5).map((inc) => (
                <IncomeCard key={inc.id} income={inc} onEdit={setEditingIncome} onDelete={handleDeleteIncome} />
              ))}
            </div>
          )}
        </section>

        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Gastos recientes</h2>
          {expensesError && <p className="dashboard__error">{expensesError}</p>}
          {loadingExpenses ? (
            <p className="dashboard__empty">Cargando…</p>
          ) : expenses.length === 0 ? (
            <p className="dashboard__empty">Aún no registras gastos. Toca el botón + para empezar.</p>
          ) : (
            <div className="expense-list">
              {expenses.map((exp) => (
                <ExpenseCard key={exp.id} expense={exp} onEdit={setEditingExpense} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </main>

      <FAB onClick={() => setShowNewRecordModal(true)} />

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
            onSubmit={addManualFunding}
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
    </div>
  );
}

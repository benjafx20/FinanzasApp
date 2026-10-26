import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { CategoryPicker } from '../categories/CategoryPicker';

// Con `recurring` edita un gasto recurrente existente (rige desde el próximo cobro).
export function RecurringExpenseForm({ recurring, categories, onSubmit, onDone, categoryManagement }) {
  const [categoryId, setCategoryId] = useState(recurring?.category_id ?? categories[0]?.id ?? '');
  const [nombre, setNombre] = useState(recurring?.nombre ?? '');
  const [monto, setMonto] = useState(recurring ? String(recurring.monto) : '');
  const [diaMes, setDiaMes] = useState(recurring ? String(recurring.dia_mes) : '1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ categoryId, nombre, monto, diaMes: Number(diaMes) });
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
        id="recurring-nombre"
        label="Nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Arriendo, Netflix, Gimnasio"
        required
        maxLength={60}
      />

      <CategoryPicker
        categories={categories}
        categoryId={categoryId}
        onChange={setCategoryId}
        allCategories={categoryManagement.allCategories}
        onAddCategory={categoryManagement.addCategory}
        onUpdateCategory={categoryManagement.updateCategory}
        onMoveCategory={categoryManagement.moveCategory}
        onToggleHidden={categoryManagement.setHidden}
        onCheckUsage={categoryManagement.checkCategoryUsage}
        onDeleteCategory={categoryManagement.deleteCategory}
      />

      <CurrencyInput id="recurring-monto" label="Monto mensual" value={monto} onChange={setMonto} placeholder="0" required />

      <Input
        id="recurring-dia"
        label="Día del mes en que se cobra"
        type="number"
        inputMode="numeric"
        min="1"
        max="31"
        value={diaMes}
        onChange={(e) => setDiaMes(e.target.value)}
        required
      />

      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : recurring ? 'Guardar cambios' : 'Crear gasto recurrente'}
      </Button>
    </form>
  );
}

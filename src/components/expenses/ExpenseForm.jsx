import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { CategoryPicker } from '../categories/CategoryPicker';
import { formatCurrency } from '../../utils/formatCurrency';
import './ExpenseForm.css';

// `categoryManagement` agrupa todo lo relacionado a categorías (lista
// completa, crear, reordenar, ocultar, eliminar) para no pasar 6 props
// sueltas. Viene armado desde el Dashboard.
// `saldosPorCategoria`: mapa category_id -> saldo real, para validar y
// mostrar cuánto hay disponible al elegir "pagar con otra categoría".
// Si se pasa `expense`, el formulario edita ese gasto; si no, crea uno nuevo.
export function ExpenseForm({ categories, expense, defaultCategoryId, saldosPorCategoria, onSubmit, onDone, categoryManagement }) {
  const isEditing = !!expense;
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [monto, setMonto] = useState(expense?.monto ?? '');
  const [fecha, setFecha] = useState(expense?.fecha ?? (() => new Date().toISOString().slice(0, 10))());
  const [nota, setNota] = useState(expense?.nota ?? '');
  const [pagarConOtra, setPagarConOtra] = useState(!!expense?.funding_category_id);
  const [fundingCategoryId, setFundingCategoryId] = useState(expense?.funding_category_id ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const efectivoFundingId = pagarConOtra ? fundingCategoryId : null;
    if (pagarConOtra) {
      if (!fundingCategoryId) {
        setError('Elige con qué categoría lo vas a pagar.');
        return;
      }
      const saldoOrigen = saldosPorCategoria?.[fundingCategoryId] ?? 0;
      if (Number(monto) > saldoOrigen) {
        setError(`Esa categoría solo tiene ${formatCurrency(saldoOrigen)} disponibles.`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({ categoryId, monto, fecha, nota: nota.trim() || null, fundingCategoryId: efectivoFundingId });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const otrasCategorias = categories.filter((c) => c.id !== categoryId);

  return (
    <form onSubmit={handleSubmit} className="expense-form">
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

      <CurrencyInput
        id="monto"
        label="Monto"
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
        autoFocus={!isEditing}
      />

      <Input
        id="fecha"
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />

      <Input
        id="nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: almuerzo con equipo"
        maxLength={100}
      />

      <label className="expense-form__funding-toggle">
        <input type="checkbox" checked={pagarConOtra} onChange={(e) => setPagarConOtra(e.target.checked)} />
        Pagado con el saldo de otra categoría
      </label>

      {pagarConOtra && (
        <div className="input-group">
          <label className="input-label" htmlFor="funding-category">¿Con qué categoría lo pagaste?</label>
          <select
            id="funding-category"
            className="input"
            value={fundingCategoryId}
            onChange={(e) => setFundingCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>Elige la categoría de origen</option>
            {otrasCategorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — disponible {formatCurrency(saldosPorCategoria?.[c.id] ?? 0)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
      </Button>
    </form>
  );
}

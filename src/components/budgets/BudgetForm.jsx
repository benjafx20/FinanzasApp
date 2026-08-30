import { useState, useEffect } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';

// Ya no es "el presupuesto" (eso lo maneja el saldo real). Es una meta de
// gasto opcional, informativa, para un período elegido acá mismo.
export function BudgetForm({ category, metaMensual, metaSemanal, onSubmit, onRemove, onDone }) {
  const [periodo, setPeriodo] = useState('semanal');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMonto((periodo === 'mensual' ? metaMensual : metaSemanal) ?? '');
  }, [periodo, metaMensual, metaSemanal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ categoryId: category.id, periodo, montoLimite: monto });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const metaActual = periodo === 'mensual' ? metaMensual : metaSemanal;

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onRemove({ categoryId: category.id, periodo });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <p className="dashboard__hint">
        Meta de gasto para {category.nombre} — solo informativa, no cambia el saldo real de la categoría.
      </p>

      <SegmentedControl
        options={[
          { value: 'semanal', label: 'Semanal' },
          { value: 'mensual', label: 'Mensual' },
        ]}
        value={periodo}
        onChange={setPeriodo}
      />

      <CurrencyInput
        id="budget-monto"
        label={`Meta ${periodo}`}
        value={monto}
        onChange={setMonto}
        placeholder="Ej: 20.000"
        required
        autoFocus
      />

      {error && <p className="auth-error" role="alert">{error}</p>}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar meta'}
      </Button>

      {metaActual != null && onRemove && (
        <Button type="button" variant="ghost" fullWidth disabled={loading} onClick={handleRemove}>
          Quitar meta {periodo}
        </Button>
      )}
    </form>
  );
}

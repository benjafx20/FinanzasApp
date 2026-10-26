import { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { confirmar } from '../../utils/dialogs';

const NINGUNA = '__ninguna__';

// Saldar una deuda. En un préstamo: ¿a qué categoría entró lo que te devolvieron?
// En una deuda tuya: ¿de qué categoría sacaste para pagar?
export function PayDebtForm({ debt, categories = [], saldoPorCategoria = {}, onSubmit, onDone }) {
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const esPrestamo = debt.tipo === 'prestado';
  const monto = Number(debt.monto);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!categoryId) return setError('Elige una categoría, o "No mover plata".');
    const categoria = categoryId !== NINGUNA ? categories.find((c) => c.id === categoryId) : null;
    if (!esPrestamo && categoria) {
      const saldo = saldoPorCategoria[categoria.id] || 0;
      if (monto > saldo) {
        const seguir = await confirmar(
          `${categoria.nombre} tiene ${formatCurrency(saldo)} y vas a sacar ${formatCurrency(monto)}. Quedará en ${formatCurrency(saldo - monto)}. ¿Continuar?`,
          { titulo: 'No alcanza el saldo' }
        );
        if (!seguir) return;
      }
    }
    setLoading(true);
    try {
      await onSubmit(debt, { tipo: debt.tipo, categoryId: categoryId === NINGUNA ? null : categoryId });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <p className="dashboard__empty">
        {esPrestamo
          ? `${debt.persona} te devolvió ${formatCurrency(monto)}.`
          : `Le pagaste ${formatCurrency(monto)} a ${debt.persona}.`}
      </p>
      <div className="input-group">
        <label className="input-label" htmlFor="pay-debt-cat">
          {esPrestamo ? '¿A qué categoría entró esa plata?' : '¿De qué categoría la sacaste?'}
        </label>
        <select id="pay-debt-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="">Elige una categoría…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({formatCurrency(saldoPorCategoria[c.id] || 0)})
            </option>
          ))}
          <option value={NINGUNA}>No mover plata (solo marcar como saldada)</option>
        </select>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : 'Marcar como saldada'}
      </Button>
    </form>
  );
}

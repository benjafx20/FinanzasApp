import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

const DE_AFUERA = '__afuera__';

// El aporte a una meta sale del saldo de una categoría (así la plata no queda
// contada dos veces). Si es plata que no está en la app, se elige "de afuera".
// Con `contribution` corrige un aporte existente.
export function ContributionForm({ goal, contribution, categories = [], saldoPorCategoria = {}, asegurarSaldo, onSubmit, onDone }) {
  const editando = !!contribution;
  const [monto, setMonto] = useState(contribution ? String(contribution.monto) : '');
  // Un aporte antiguo no tiene origen: se obliga a elegir para que quede claro.
  const [origen, setOrigen] = useState(contribution?.source_category_id || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!origen) {
      setError('Elige de dónde sacaste la plata.');
      return;
    }
    const montoNum = Number(monto) || 0;
    const categoria = categories.find((c) => c.id === origen);
    // Al corregir un aporte, lo que ya había sacado de esa categoría vuelve a estar disponible.
    const yaSacado = editando && contribution.source_category_id === origen ? Number(contribution.monto) : 0;
    if (categoria && asegurarSaldo) {
      try {
        await asegurarSaldo({ categoryId: categoria.id, monto: montoNum, saldoExtra: yaSacado, motivo: `aporte a "${goal.nombre}"` });
      } catch (err) {
        if (err.message) setError(err.message);
        return;
      }
    }
    setLoading(true);
    try {
      await onSubmit(goal.id, monto, origen === DE_AFUERA ? null : origen);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <CurrencyInput
        id="contribution-monto"
        label={`Aporte para "${goal.nombre}"`}
        value={monto}
        onChange={setMonto}
        placeholder="Ej: 20.000"
        required
      />
      <div className="input-group">
        <label className="input-label" htmlFor="contribution-origen">¿De dónde sacaste la plata?</label>
        <select id="contribution-origen" className="input" value={origen} onChange={(e) => setOrigen(e.target.value)} required>
          <option value="">Elige una categoría…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({formatCurrency(saldoPorCategoria[c.id] || 0)})
            </option>
          ))}
          <option value={DE_AFUERA}>Plata de afuera (no descontar de ninguna)</option>
        </select>
      </div>
      <p className="dashboard__empty">
        Se descuenta del saldo de esa categoría. Si eliminas la meta, la plata vuelve a su categoría.
      </p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar aporte'}
      </Button>
    </form>
  );
}

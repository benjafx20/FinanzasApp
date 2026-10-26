import { useMemo, useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

// Reparte en categorías la parte de un ingreso que quedó sin repartir.
export function DistributeIncomeForm({ income, restante, categories, etiquetasSugeridas = [], onSubmit, onDone }) {
  const [reparto, setReparto] = useState({}); // { categoryId: monto }
  const [etiqueta, setEtiqueta] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => Object.values(reparto).reduce((s, v) => s + (Number(v) || 0), 0), [reparto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (total <= 0) return setError('Pon cuánto va en al menos una categoría.');
    if (total > restante) return setError(`Repartiste más de lo que queda sin repartir (${formatCurrency(restante)}).`);
    setLoading(true);
    try {
      const repartoArray = Object.entries(reparto)
        .filter(([, v]) => Number(v) > 0)
        .map(([categoryId, v]) => ({ categoryId, monto: Number(v) }));
      await onSubmit(repartoArray, etiqueta.trim() || null);
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
        Del ingreso de {formatCurrency(Number(income.monto))} quedan {formatCurrency(restante)} sin repartir.
      </p>
      {categories.map((c) => (
        <CurrencyInput
          key={c.id}
          id={`distribute-${c.id}`}
          label={c.nombre}
          value={reparto[c.id] || ''}
          onChange={(v) => setReparto((prev) => ({ ...prev, [c.id]: v }))}
          placeholder="0"
        />
      ))}
      <Input
        id="distribute-etiqueta"
        label="Agrupar como (opcional)"
        type="text"
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        maxLength={60}
        list="distribute-etiquetas"
      />
      {etiquetasSugeridas.length > 0 && (
        <datalist id="distribute-etiquetas">
          {etiquetasSugeridas.map((et) => (
            <option key={et} value={et} />
          ))}
        </datalist>
      )}
      <p className="dashboard__empty">Repartido: {formatCurrency(total)} de {formatCurrency(restante)}</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Repartiendo…' : 'Repartir'}
      </Button>
    </form>
  );
}

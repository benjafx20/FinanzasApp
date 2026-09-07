import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';

export function ContributionForm({ goal, onSubmit, onDone }) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(goal.id, monto);
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
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : 'Registrar aporte'}
      </Button>
    </form>
  );
}

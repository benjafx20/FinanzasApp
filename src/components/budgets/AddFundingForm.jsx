import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function AddFundingForm({ category, onSubmit, onDone }) {
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ categoryId: category.id, monto, nota });
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
        id="funding-monto"
        label={`Agregar plata a ${category.nombre}`}
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
        autoFocus
      />
      <Input
        id="funding-nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: vendí el celular viejo"
        maxLength={100}
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Agregando…' : 'Agregar plata'}
      </Button>
    </form>
  );
}

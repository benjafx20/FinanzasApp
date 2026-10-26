import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { hoyISO } from '../../utils/dates';

// Cerrar una meta lograda: se anota en qué se gastó la plata. Es solo una
// anotación: no cambia ningún saldo, porque la plata ya estaba descontada.
export function CloseGoalForm({ goal, onSubmit, onDone }) {
  const [usedFor, setUsedFor] = useState('');
  const [usedAt, setUsedAt] = useState(() => hoyISO());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ usedFor, usedAt });
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
        Vas a cerrar la meta "{goal.nombre}". La plata ahorrada se da por usada y no vuelve a las categorías de donde salió.
      </p>
      <Input
        id="close-goal-used-for"
        label="¿En qué se gastó? (opcional)"
        type="text"
        value={usedFor}
        onChange={(e) => setUsedFor(e.target.value)}
        placeholder="Ej: iPhone 14, pasajes a Pucón…"
        maxLength={100}
      />
      <Input id="close-goal-used-at" label="¿Cuándo?" type="date" value={usedAt} onChange={(e) => setUsedAt(e.target.value)} required />
      <p className="dashboard__empty">Esto es solo una nota: no cambia ningún saldo.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : 'Cerrar meta'}
      </Button>
    </form>
  );
}

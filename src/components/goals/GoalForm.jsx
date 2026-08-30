import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';

export function GoalForm({ onSubmit, onDone }) {
  const [nombre, setNombre] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [fechaObjetivo, setFechaObjetivo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ nombre, montoObjetivo, fechaObjetivo: fechaObjetivo || null });
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
        id="goal-nombre"
        label="Nombre de la meta"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Vacaciones, fondo de emergencia"
        required
        maxLength={60}
      />
      <CurrencyInput
        id="goal-monto"
        label="Monto objetivo"
        value={montoObjetivo}
        onChange={setMontoObjetivo}
        placeholder="Ej: 500.000"
        required
      />
      <Input
        id="goal-fecha"
        label="Fecha objetivo (opcional)"
        type="date"
        value={fechaObjetivo}
        onChange={(e) => setFechaObjetivo(e.target.value)}
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Creando…' : 'Crear meta'}
      </Button>
    </form>
  );
}

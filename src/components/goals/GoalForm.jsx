import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { hoyISO } from '../../utils/dates';

// Con `goal` edita una meta existente; sin él, crea una nueva.
export function GoalForm({ goal, onSubmit, onDone }) {
  const [nombre, setNombre] = useState(goal?.nombre || '');
  const [montoObjetivo, setMontoObjetivo] = useState(goal ? String(goal.monto_objetivo) : '');
  const [fechaObjetivo, setFechaObjetivo] = useState(goal?.fecha_objetivo || '');
  const cerrada = !!goal?.completed_at;
  const [usedFor, setUsedFor] = useState(goal?.used_for || '');
  const [usedAt, setUsedAt] = useState(goal?.used_at || hoyISO());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        nombre,
        montoObjetivo,
        fechaObjetivo: fechaObjetivo || null,
        ...(cerrada ? { usedFor, usedAt } : {}),
      });
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
      {cerrada && (
        <>
          <Input
            id="goal-used-for"
            label="¿En qué se gastó?"
            type="text"
            value={usedFor}
            onChange={(e) => setUsedFor(e.target.value)}
            placeholder="Ej: iPhone 14"
            maxLength={100}
          />
          <Input id="goal-used-at" label="¿Cuándo?" type="date" value={usedAt} onChange={(e) => setUsedAt(e.target.value)} />
        </>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : goal ? 'Guardar cambios' : 'Crear meta'}
      </Button>
    </form>
  );
}

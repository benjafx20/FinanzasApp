import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { hoyISO } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatCurrency';

const DE_AFUERA = '__afuera__';

// Con `goal` edita una meta existente; sin él, crea una nueva.
// Al editar también se puede cambiar cuánto llevas ahorrado (`ahorrado`): si sube, hay
// que decir de dónde sale la plata; si baja, se deshacen los aportes más recientes.
export function GoalForm({ goal, ahorrado = 0, categories = [], saldoPorCategoria = {}, onSubmit, onDone }) {
  const [nombre, setNombre] = useState(goal?.nombre || '');
  const [montoObjetivo, setMontoObjetivo] = useState(goal ? String(goal.monto_objetivo) : '');
  const [fechaObjetivo, setFechaObjetivo] = useState(goal?.fecha_objetivo || '');
  const cerrada = !!goal?.completed_at;
  const [ahorradoNuevo, setAhorradoNuevo] = useState(goal ? String(Math.round(ahorrado)) : '');
  const [origen, setOrigen] = useState('');
  const ahorradoNum = Number(ahorradoNuevo) || 0;
  const sube = !!goal && ahorradoNum > Math.round(ahorrado);
  const baja = !!goal && ahorradoNum < Math.round(ahorrado);
  const [usedFor, setUsedFor] = useState(goal?.used_for || '');
  const [usedAt, setUsedAt] = useState(goal?.used_at || hoyISO());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (sube && !origen) {
      setError('Elige de dónde sacaste la plata que sumaste.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        nombre,
        montoObjetivo,
        fechaObjetivo: fechaObjetivo || null,
        ...(cerrada ? { usedFor, usedAt } : {}),
        ...(goal && (sube || baja) ? { ahorradoNuevo: ahorradoNum, origenAhorro: origen === DE_AFUERA ? null : origen } : {}),
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
      {goal && (
        <>
          <CurrencyInput
            id="goal-ahorrado"
            label="Cantidad ahorrada hasta ahora"
            value={ahorradoNuevo}
            onChange={setAhorradoNuevo}
            placeholder="0"
          />
          {sube && (
            <div className="input-group">
              <label className="input-label" htmlFor="goal-origen">¿De dónde sacaste esa plata?</label>
              <select id="goal-origen" className="input" value={origen} onChange={(e) => setOrigen(e.target.value)} required>
                <option value="">Elige una categoría…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatCurrency(saldoPorCategoria[c.id] || 0)})
                  </option>
                ))}
                <option value={DE_AFUERA}>Plata de afuera (no descontar de ninguna)</option>
              </select>
            </div>
          )}
          {baja && (
            <p className="dashboard__empty">
              Se deshacen los aportes más recientes hasta llegar a ese monto, y la plata vuelve a la categoría de donde salió.
            </p>
          )}
        </>
      )}
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

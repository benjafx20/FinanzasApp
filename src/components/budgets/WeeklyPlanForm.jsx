import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

// Activa el presupuesto semanal de una categoría: la plata sigue en la
// categoría (el saldo real no cambia), pero se muestra lo que te toca gastar
// cada semana. `otrasCategorias`: posibles destinos del sobrante.
export function WeeklyPlanForm({ category, saldo, otrasCategorias, onSubmit, onDone }) {
  const [monto, setMonto] = useState('');
  const [semanas, setSemanas] = useState('4');
  const [modo, setModo] = useState('esta');
  const [sobranteId, setSobranteId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const montoNum = Number(monto) || 0;
  const semanasNum = Number(semanas) || 0;
  const total = montoNum * semanasNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        categoryId: category.id,
        monto: montoNum,
        semanas: semanasNum,
        modo,
        sobranteCategoryId: sobranteId || null,
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
      <CurrencyInput
        id="plan-monto"
        label={`Cuánto quieres gastar por semana en ${category.nombre}`}
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
      />
      <Input
        id="plan-semanas"
        label="Durante cuántas semanas"
        type="number"
        min="1"
        max="52"
        step="1"
        value={semanas}
        onChange={(e) => setSemanas(e.target.value)}
        required
      />

      <div className="input-group">
        <label className="input-label" htmlFor="plan-modo">¿Cuándo parte?</label>
        <select id="plan-modo" className="input" value={modo} onChange={(e) => setModo(e.target.value)}>
          <option value="esta">Esta semana (desde hoy)</option>
          <option value="lunes">El lunes (semana completa)</option>
        </select>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="plan-sobrante">Si sobra plata de la semana, mandarla a</label>
        <select id="plan-sobrante" className="input" value={sobranteId} onChange={(e) => setSobranteId(e.target.value)}>
          <option value="">No mover (se queda en {category.nombre})</option>
          {otrasCategorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {total > 0 && (
        <p className="dashboard__empty">
          Son {formatCurrency(total)} en total. Hoy tienes {formatCurrency(saldo)} en esta categoría.
          {total > saldo ? ' Ojo: el total supera lo que hay ahora.' : ''}
        </p>
      )}
      <p className="dashboard__empty">
        El saldo real no cambia. Cada domingo en la noche el sobrante se mueve solo; si te pasas, la
        semana queda en negativo y se descuenta de la siguiente.
      </p>

      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Activando…' : 'Activar presupuesto semanal'}
      </Button>
    </form>
  );
}

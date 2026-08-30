import { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import './IncomeForm.css';

// `categories`: solo se pasa para un ingreso NUEVO (no al editar), para
// poder repartirlo entre categorías ahí mismo. Es opcional: si no reparte
// nada, el ingreso igual queda registrado, solo que no le suma saldo a
// ninguna categoría (puede hacerlo después con "+ Agregar plata").
export function IncomeForm({ income, categories, onSubmit, onDone }) {
  const isEditing = !!income;
  const [monto, setMonto] = useState(income?.monto ?? '');
  const [fecha, setFecha] = useState(income?.fecha ?? (() => new Date().toISOString().slice(0, 10))());
  const [nota, setNota] = useState(income?.nota ?? '');
  const [reparto, setReparto] = useState({}); // { categoryId: monto }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalRepartido = useMemo(
    () => Object.values(reparto).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [reparto]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (totalRepartido > Number(monto)) {
      setError('Repartiste más de lo que ingresó. Ajusta los montos.');
      return;
    }
    setLoading(true);
    try {
      const repartoArray = Object.entries(reparto)
        .filter(([, v]) => Number(v) > 0)
        .map(([categoryId, v]) => ({ categoryId, monto: Number(v) }));
      await onSubmit({ monto, fecha, nota: nota.trim() || null }, repartoArray);
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
        id="income-monto"
        label="Monto"
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
        autoFocus={!isEditing}
      />
      <Input
        id="income-fecha"
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />
      <Input
        id="income-nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: sueldo, venta, extra"
        maxLength={100}
      />

      {!isEditing && categories?.length > 0 && (
        <div className="income-split">
          <span className="input-label">Repartir en categorías (opcional)</span>
          <div className="income-split__list">
            {categories.map((cat) => (
              <div key={cat.id} className="income-split__row">
                <span className="income-split__label" style={{ color: cat.color }}>
                  <CategoryIcon name={cat.icono} size={15} />
                  {cat.nombre}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="income-split__input"
                  placeholder="0"
                  value={reparto[cat.id] ?? ''}
                  onChange={(e) => setReparto((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <span className={`income-split__total ${totalRepartido > Number(monto || 0) ? 'income-split__total--error' : ''}`}>
            Repartido: {formatCurrency(totalRepartido)} de {formatCurrency(Number(monto || 0))}
          </span>
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar ingreso'}
      </Button>
    </form>
  );
}

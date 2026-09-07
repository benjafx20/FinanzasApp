import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { formatCurrency } from '../../utils/formatCurrency';
import './TransferForm.css';

// El origen viene fijo (se abre siempre desde el detalle de una categoría),
// solo se elige el destino. Así queda claro de dónde sale la plata.
export function TransferForm({ fromCategory, disponibleOrigen, categories, onSubmit, onDone }) {
  const [toCategoryId, setToCategoryId] = useState('');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (Number(monto) > disponibleOrigen) {
      setError(`No puedes mover más de lo disponible en ${fromCategory.nombre}: ${formatCurrency(disponibleOrigen)}.`);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ fromCategoryId: fromCategory.id, toCategoryId, monto, nota });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="transfer-from">
        <span className="transfer-from__chip" style={{ color: fromCategory.color }}>
          <CategoryIcon name={fromCategory.icono} size={16} />
          {fromCategory.nombre}
        </span>
        <span className="transfer-from__disponible">disponible {formatCurrency(disponibleOrigen)}</span>
        <ArrowRight size={16} className="transfer-from__arrow" />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="transfer-to">Hacia</label>
        <select
          id="transfer-to"
          className="input"
          value={toCategoryId}
          onChange={(e) => setToCategoryId(e.target.value)}
          required
        >
          <option value="" disabled>Elige la categoría de destino</option>
          {categories.filter((c) => c.id !== fromCategory.id).map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <CurrencyInput id="transfer-monto" label="Monto a mover" value={monto} onChange={setMonto} placeholder="0" required />

      <Input
        id="transfer-nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: usé el ahorro de esta semana en el súper"
        maxLength={100}
      />

      {error && <p className="auth-error" role="alert">{error}</p>}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Moviendo…' : 'Mover plata'}
      </Button>
    </form>
  );
}

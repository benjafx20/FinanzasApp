import { useState } from 'react';
import { hoyISO } from '../../utils/dates';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { formatCurrency } from '../../utils/formatCurrency';
import { confirmar } from '../../utils/dialogs';
import './DebtForm.css';

const NINGUNA = '__ninguna__';

// Con `debt` edita una deuda existente (el tipo no se puede cambiar).
// En un préstamo se elige de qué categoría sale la plata, o "No descontar"
// si solo se quiere dejar registrado.
export function DebtForm({ debt, categories = [], saldoPorCategoria = {}, onSubmit, onDone }) {
  const editando = !!debt;
  const [tipo, setTipo] = useState(debt?.tipo || 'prestado');
  const [persona, setPersona] = useState(debt?.persona || '');
  const [monto, setMonto] = useState(debt ? String(debt.monto) : '');
  const [fecha, setFecha] = useState(() => debt?.fecha || hoyISO());
  const [nota, setNota] = useState(debt?.nota || '');
  const [origen, setOrigen] = useState(debt ? debt.source_category_id || NINGUNA : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!persona.trim()) return setError('Falta el nombre de la persona.');
    if (!monto || monto <= 0) return setError('El monto debe ser mayor a 0.');
    if (tipo === 'prestado' && !origen) return setError('Elige de qué categoría sale la plata (o "No descontar").');

    const montoNum = Number(monto);
    const categoria = tipo === 'prestado' && origen !== NINGUNA ? categories.find((c) => c.id === origen) : null;
    if (categoria) {
      const disponible = (saldoPorCategoria[categoria.id] || 0) + (editando && debt.source_category_id === origen ? Number(debt.monto) : 0);
      if (montoNum > disponible) {
        const seguir = await confirmar(
          `${categoria.nombre} tiene ${formatCurrency(disponible)} y vas a sacar ${formatCurrency(montoNum)}. Quedará en ${formatCurrency(disponible - montoNum)}. ¿Continuar?`,
          { titulo: 'No alcanza el saldo' }
        );
        if (!seguir) return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        persona,
        tipo,
        monto: montoNum,
        fecha,
        nota,
        sourceCategoryId: tipo === 'prestado' ? (origen === NINGUNA ? null : origen) : undefined,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="debt-form">
      {editando ? (
        <p className="dashboard__empty">{tipo === 'prestado' ? 'Le presté' : 'Le debo'}</p>
      ) : (
        <SegmentedControl
          options={[
            { value: 'prestado', label: 'Le presté' },
            { value: 'debo', label: 'Le debo' },
          ]}
          value={tipo}
          onChange={setTipo}
        />
      )}

      <Input
        label="¿A quién / de quién?"
        id="debt-persona"
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        placeholder="Ej: Juan, mi hermana..."
        required
      />

      <CurrencyInput label="Monto" id="debt-monto" value={monto} onChange={setMonto} placeholder="0" required />

      {tipo === 'prestado' && (
        <div className="input-group">
          <label className="input-label" htmlFor="debt-origen">¿De qué categoría sale la plata?</label>
          <select id="debt-origen" className="input" value={origen} onChange={(e) => setOrigen(e.target.value)} required>
            <option value="">Elige una categoría…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({formatCurrency(saldoPorCategoria[c.id] || 0)})
              </option>
            ))}
            <option value={NINGUNA}>No descontar (solo dejar registrado)</option>
          </select>
        </div>
      )}

      <Input label="Fecha" id="debt-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <Input
        label="Nota (opcional)"
        id="debt-nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: para la bencina del viaje"
      />

      {error && <p className="debt-form__error">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar'}
      </Button>
    </form>
  );
}

import { useState } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import './DebtForm.css';

export function DebtForm({ onSubmit, onDone }) {
  const [tipo, setTipo] = useState('prestado');
  const [persona, setPersona] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!persona.trim()) return setError('Falta el nombre de la persona.');
    if (!monto || monto <= 0) return setError('El monto debe ser mayor a 0.');

    setLoading(true);
    try {
      await onSubmit({ persona, tipo, monto: Number(monto), fecha, nota });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="debt-form">
      <SegmentedControl
        options={[
          { value: 'prestado', label: 'Le presté' },
          { value: 'debo', label: 'Le debo' },
        ]}
        value={tipo}
        onChange={setTipo}
      />

      <Input
        label="¿A quién / de quién?"
        id="debt-persona"
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        placeholder="Ej: Juan, mi hermana..."
        required
      />

      <CurrencyInput
        label="Monto"
        id="debt-monto"
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
      />

      <Input
        label="Fecha"
        id="debt-fecha"
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />

      <Input
        label="Nota (opcional)"
        id="debt-nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: para la bencina del viaje"
      />

      {error && <p className="debt-form__error">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  );
}

import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

// Corrige monto, fecha y nota de un movimiento entre categorías.
// `disponibleOrigen` ya incluye lo que este movimiento sacó del origen.
export function EditTransferForm({ transfer, disponibleOrigen, onSubmit, onDone }) {
  const [monto, setMonto] = useState(String(transfer.monto));
  const [fecha, setFecha] = useState(transfer.fecha);
  const [nota, setNota] = useState(transfer.nota || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (Number(monto) > disponibleOrigen) {
      setError(`No puedes mover más de lo disponible en ${transfer.origen?.nombre ?? 'el origen'}: ${formatCurrency(disponibleOrigen)}.`);
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ monto, fecha, nota });
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
        {transfer.origen?.nombre ?? 'Origen'} → {transfer.destino?.nombre ?? 'Destino'}
      </p>
      <CurrencyInput id="transfer-edit-monto" label="Monto" value={monto} onChange={setMonto} required />
      <Input id="transfer-edit-fecha" label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      <Input id="transfer-edit-nota" label="Nota (opcional)" type="text" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={100} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}

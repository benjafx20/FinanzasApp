import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

// Edita un aporte (monto, fecha, nota y grupo). Si cambia el monto, antes de
// guardar muestra cómo queda el saldo de la categoría y pide confirmar.
// `maxMonto`: tope cuando el aporte viene de un ingreso (lo que queda sin repartir).
export function EditFundingForm({ funding, categoryName, saldo, etiquetasSugeridas = [], maxMonto = null, onSubmit, onDone }) {
  const [monto, setMonto] = useState(String(funding.monto));
  const [fecha, setFecha] = useState(funding.fecha);
  const [nota, setNota] = useState(funding.nota || '');
  const [etiqueta, setEtiqueta] = useState(funding.etiqueta || '');
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const montoNum = Number(monto) || 0;
  const montoViejo = Number(funding.monto);
  const cambioMonto = montoNum !== montoViejo;
  const saldoDespues = saldo + (montoNum - montoViejo);

  const guardar = async () => {
    setError('');
    setLoading(true);
    try {
      await onSubmit({ monto: montoNum, fecha, nota, etiqueta });
      onDone();
    } catch (err) {
      setError(err.message);
      setConfirmando(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!montoNum || montoNum <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }
    if (maxMonto !== null && montoNum > maxMonto) {
      setError(
        `Este aporte viene de un ingreso y como máximo puede ser ${formatCurrency(maxMonto)} (lo que queda sin repartir de ese ingreso).`
      );
      return;
    }
    if (cambioMonto && !confirmando) {
      setConfirmando(true);
      return;
    }
    guardar();
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <CurrencyInput id="funding-edit-monto" label="Monto" value={monto} onChange={(v) => { setMonto(v); setConfirmando(false); }} required />
      <Input id="funding-edit-fecha" label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      <Input id="funding-edit-nota" label="Nota (opcional)" type="text" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={100} />
      <Input
        id="funding-edit-etiqueta"
        label="Agrupar como (opcional)"
        type="text"
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        maxLength={60}
        list="funding-edit-etiquetas"
      />
      {etiquetasSugeridas.length > 0 && (
        <datalist id="funding-edit-etiquetas">
          {etiquetasSugeridas.map((et) => (
            <option key={et} value={et} />
          ))}
        </datalist>
      )}

      {confirmando && (
        <p className="dashboard__empty">
          El aporte pasa de {formatCurrency(montoViejo)} a {formatCurrency(montoNum)}. El saldo de {categoryName} pasará
          de {formatCurrency(saldo)} a {formatCurrency(saldoDespues)}.
          {saldoDespues < 0 ? ' Ojo: quedará en negativo, porque ya se gastó parte de esa plata.' : ''}
        </p>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : confirmando ? 'Sí, confirmar el cambio' : 'Guardar'}
      </Button>
      {confirmando && (
        <Button type="button" variant="ghost" fullWidth onClick={() => setConfirmando(false)} disabled={loading}>
          Volver a editar
        </Button>
      )}
    </form>
  );
}

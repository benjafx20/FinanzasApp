import { useState } from 'react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// `etiquetasSugeridas`: grupos ya usados en esta categoría (gastos y aportes).
export function AddFundingForm({ category, etiquetasSugeridas = [], onSubmit, onDone }) {
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ categoryId: category.id, monto, nota, etiqueta });
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
        id="funding-monto"
        label={`Agregar plata a ${category.nombre}`}
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
      />
      <Input
        id="funding-nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: vendí el celular viejo"
        maxLength={100}
      />
      <Input
        id="funding-etiqueta"
        label="Agrupar como (opcional)"
        type="text"
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        placeholder="Ej: Samsung A06"
        maxLength={60}
        list="funding-etiquetas-sugeridas"
      />
      {etiquetasSugeridas.length > 0 && (
        <datalist id="funding-etiquetas-sugeridas">
          {etiquetasSugeridas.map((et) => (
            <option key={et} value={et} />
          ))}
        </datalist>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Agregando…' : 'Agregar plata'}
      </Button>
    </form>
  );
}

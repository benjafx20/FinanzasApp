import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { CategoryPicker } from '../categories/CategoryPicker';
import { formatCurrency } from '../../utils/formatCurrency';
import { scanReceipt } from '../../utils/scanReceipt';
import './ExpenseForm.css';

// `categoryManagement` agrupa todo lo relacionado a categorías (lista
// completa, crear, reordenar, ocultar, eliminar) para no pasar 6 props
// sueltas. Viene armado desde el Dashboard.
// `saldosPorCategoria`: mapa category_id -> saldo real, para validar y
// mostrar cuánto hay disponible al elegir "pagar con otra categoría".
// Si se pasa `expense`, el formulario edita ese gasto; si no, crea uno nuevo.
export function ExpenseForm({ categories, expenses, expense, defaultCategoryId, saldosPorCategoria, onSubmit, onDone, categoryManagement }) {
  const isEditing = !!expense;
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '');
  const [monto, setMonto] = useState(expense?.monto ?? '');
  const [fecha, setFecha] = useState(expense?.fecha ?? (() => new Date().toISOString().slice(0, 10))());
  const [nota, setNota] = useState(expense?.nota ?? '');
  const [etiqueta, setEtiqueta] = useState(expense?.etiqueta ?? '');
  const [pagarConOtra, setPagarConOtra] = useState(!!expense?.funding_category_id);
  const [fundingCategoryId, setFundingCategoryId] = useState(expense?.funding_category_id ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  // Resultado del último escaneo, pendiente de que el usuario lo confirme o lo edite.
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleScanClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // para poder elegir la misma foto de nuevo si hace falta
    if (!file) return;

    setScanning(true);
    setScanNotice('');
    setScanResult(null);
    setError('');
    try {
      const leido = await scanReceipt(file, categories);
      setScanResult(leido);
    } catch (err) {
      setScanNotice(err.message);
    } finally {
      setScanning(false);
    }
  };

  const nombreCategoriaLeida = categories.find((c) => c.id === scanResult?.categoryId)?.nombre;
  const fechaLegible = (iso) => (iso ? iso.split('-').reverse().join('-') : null);
  // Guardar directo solo si el escaneo trajo lo mínimo para un gasto completo.
  const escaneoCompleto = !!(scanResult?.monto && scanResult?.fecha && scanResult?.categoryId);

  // "No, editar": pasa lo leído al formulario para corregir cualquier cosa.
  const editarEscaneo = () => {
    if (scanResult.monto) setMonto(scanResult.monto);
    if (scanResult.fecha) setFecha(scanResult.fecha);
    if (scanResult.categoryId) setCategoryId(scanResult.categoryId);
    if (scanResult.comercio) setNota(scanResult.comercio);
    setScanResult(null);
    setScanNotice('Revisa y corrige lo que haga falta, y guarda abajo.');
  };

  // "Sí, es eso": guarda el gasto tal cual lo leyó.
  const guardarEscaneo = async () => {
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        categoryId: scanResult.categoryId,
        monto: scanResult.monto,
        fecha: scanResult.fecha,
        nota: scanResult.comercio || null,
        fundingCategoryId: null,
        etiqueta: null,
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const efectivoFundingId = pagarConOtra ? fundingCategoryId : null;
    if (pagarConOtra) {
      if (!fundingCategoryId) {
        setError('Elige con qué categoría lo vas a pagar.');
        return;
      }
      const saldoOrigen = saldosPorCategoria?.[fundingCategoryId] ?? 0;
      if (Number(monto) > saldoOrigen) {
        setError(`Esa categoría solo tiene ${formatCurrency(saldoOrigen)} disponibles.`);
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({ categoryId, monto, fecha, nota: nota.trim() || null, fundingCategoryId: efectivoFundingId, etiqueta: etiqueta.trim() || null });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const otrasCategorias = categories.filter((c) => c.id !== categoryId);

  // Grupos ya usados en esta misma categoría (ej: "Samsung A06"), para que al
  // escribir se puedan elegir de una lista en vez de tener que escribir el
  // nombre exacto de nuevo y arriesgarse a un typo que rompa el agrupamiento.
  const etiquetasSugeridas = [
    ...new Set(
      (expenses || [])
        .filter((e) => e.category_id === categoryId && e.etiqueta)
        .map((e) => e.etiqueta)
    ),
  ];

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      {!isEditing && (
        <div className="expense-form__scan">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="expense-form__scan-input"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            className="expense-form__scan-btn"
            onClick={handleScanClick}
            disabled={scanning}
          >
            {scanning ? <Loader2 size={16} className="expense-form__scan-spinner" /> : <Camera size={16} />}
            {scanning ? 'Leyendo la boleta…' : 'Escanear boleta'}
          </button>
          {scanNotice && <p className="expense-form__scan-notice">{scanNotice}</p>}
          {scanResult && (
            <div className="expense-form__scan-result">
              <strong className="expense-form__scan-result-title">Esto leí de la boleta</strong>
              <dl className="expense-form__scan-result-list">
                <div><dt>Comercio</dt><dd>{scanResult.comercio || 'No se leyó'}</dd></div>
                <div><dt>Monto</dt><dd>{scanResult.monto ? formatCurrency(scanResult.monto) : 'No se leyó'}</dd></div>
                <div><dt>Fecha</dt><dd>{fechaLegible(scanResult.fecha) || 'No se leyó'}</dd></div>
                <div><dt>Categoría</dt><dd>{nombreCategoriaLeida || 'Sin sugerencia'}</dd></div>
              </dl>
              <div className="expense-form__scan-result-actions">
                {escaneoCompleto && (
                  <Button type="button" fullWidth onClick={guardarEscaneo} disabled={loading}>
                    {loading ? 'Guardando…' : 'Sí, es eso. Guardar'}
                  </Button>
                )}
                <Button type="button" variant="ghost" fullWidth onClick={editarEscaneo} disabled={loading}>
                  {escaneoCompleto ? 'No, quiero editar' : 'Revisar y editar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <CategoryPicker
        categories={categories}
        categoryId={categoryId}
        onChange={setCategoryId}
        allCategories={categoryManagement.allCategories}
        onAddCategory={categoryManagement.addCategory}
        onUpdateCategory={categoryManagement.updateCategory}
        onMoveCategory={categoryManagement.moveCategory}
        onToggleHidden={categoryManagement.setHidden}
        onCheckUsage={categoryManagement.checkCategoryUsage}
        onDeleteCategory={categoryManagement.deleteCategory}
      />

      <CurrencyInput
        id="monto"
        label="Monto"
        value={monto}
        onChange={setMonto}
        placeholder="0"
        required
      />

      <Input
        id="fecha"
        label="Fecha"
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />

      <Input
        id="nota"
        label="Nota (opcional)"
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej: almuerzo con equipo"
        maxLength={100}
      />

      <Input
        id="etiqueta"
        label="Agrupar como (opcional)"
        type="text"
        value={etiqueta}
        onChange={(e) => setEtiqueta(e.target.value)}
        placeholder="Ej: Samsung A06"
        maxLength={60}
        list="etiquetas-sugeridas"
      />
      {etiquetasSugeridas.length > 0 && (
        <datalist id="etiquetas-sugeridas">
          {etiquetasSugeridas.map((et) => (
            <option key={et} value={et} />
          ))}
        </datalist>
      )}

      <label className="expense-form__funding-toggle">
        <input type="checkbox" checked={pagarConOtra} onChange={(e) => setPagarConOtra(e.target.checked)} />
        Pagado con el saldo de otra categoría
      </label>

      {pagarConOtra && (
        <div className="input-group">
          <label className="input-label" htmlFor="funding-category">¿Con qué categoría lo pagaste?</label>
          <select
            id="funding-category"
            className="input"
            value={fundingCategoryId}
            onChange={(e) => setFundingCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>Elige la categoría de origen</option>
            {otrasCategorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — disponible {formatCurrency(saldosPorCategoria?.[c.id] ?? 0)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
      </Button>
    </form>
  );
}

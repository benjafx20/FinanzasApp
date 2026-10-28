import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { registerDialogHost } from '../utils/dialogs';
import { formatCurrency } from '../utils/formatCurrency';

// Cuando no alcanza la plata de una categoría: avisa y deja elegir de cuál
// categoría sacar lo que falta (se registra como un movimiento de plata).
function CubrirFaltante({ dialogo, onResolve }) {
  const [origen, setOrigen] = useState('');
  const { mensaje, faltante, opciones } = dialogo;
  return (
    <div className="expense-form">
      <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{mensaje}</p>
      {opciones.length > 0 ? (
        <div className="input-group">
          <label className="input-label" htmlFor="cubrir-origen">
            ¿De qué categoría sacas lo que falta ({formatCurrency(faltante)})?
          </label>
          <select id="cubrir-origen" className="input" value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Elige una categoría…</option>
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre} ({formatCurrency(o.saldo)})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="dashboard__empty">Ninguna otra categoría tiene lo suficiente para cubrir {formatCurrency(faltante)}.</p>
      )}
      <Button type="button" fullWidth disabled={!origen} onClick={() => onResolve({ accion: 'mover', fromCategoryId: origen })}>
        Mover {formatCurrency(faltante)} y continuar
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={() => onResolve({ accion: 'negativo' })}>
        Continuar igual (quedará en negativo)
      </Button>
      <Button type="button" variant="ghost" fullWidth onClick={() => onResolve(null)}>
        Cancelar
      </Button>
    </div>
  );
}

// Dibuja los avisos y confirmaciones pedidos con alertar() / confirmar() /
// cubrirFaltante(). Si se piden varios seguidos, se muestran de uno en uno.
export function DialogHost() {
  const [cola, setCola] = useState([]);

  useEffect(() => registerDialogHost((dialogo) => setCola((q) => [...q, dialogo])), []);

  const actual = cola[0];
  const cerrar = (valor) => {
    actual.resolve(valor);
    setCola((q) => q.slice(1));
  };
  const alCerrarConX = () => {
    if (!actual) return;
    if (actual.tipo === 'confirm') cerrar(false);
    else if (actual.tipo === 'cubrir') cerrar(null);
    else cerrar(undefined);
  };

  return (
    <Modal open={!!actual} onClose={alCerrarConX} title={actual?.titulo || ''}>
      {actual?.tipo === 'cubrir' && <CubrirFaltante key={cola.length} dialogo={actual} onResolve={cerrar} />}
      {actual && actual.tipo !== 'cubrir' && (
        <div className="expense-form">
          <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{actual.mensaje}</p>
          {actual.tipo === 'confirm' ? (
            <>
              <Button type="button" fullWidth variant={actual.peligro ? 'danger' : 'primary'} onClick={() => cerrar(true)}>
                {actual.textoConfirmar}
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={() => cerrar(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button type="button" fullWidth onClick={() => cerrar()}>
              Entendido
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { registerDialogHost } from '../utils/dialogs';

// Dibuja los avisos y confirmaciones pedidos con alertar() / confirmar().
// Si se piden varios seguidos, se muestran de uno en uno.
export function DialogHost() {
  const [cola, setCola] = useState([]);

  useEffect(() => registerDialogHost((dialogo) => setCola((q) => [...q, dialogo])), []);

  const actual = cola[0];
  const cerrar = (valor) => {
    actual.resolve(valor);
    setCola((q) => q.slice(1));
  };

  return (
    <Modal
      open={!!actual}
      onClose={() => actual && cerrar(actual.tipo === 'confirm' ? false : undefined)}
      title={actual?.titulo || ''}
    >
      {actual && (
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

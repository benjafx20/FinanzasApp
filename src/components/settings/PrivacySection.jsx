import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { alertar, confirmar } from '../../utils/dialogs';
import { retirarConsentimientosIA } from '../../utils/privacidad';
import { eliminarCuenta } from '../../utils/eliminarCuenta';
import { PoliticaPrivacidad } from './PoliticaPrivacidad';

// Ajustes > Privacidad: política, retirar el permiso de IA y eliminar la cuenta.
export function PrivacySection({ userId }) {
  const [verPolitica, setVerPolitica] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const retirar = async () => {
    if (!(await confirmar('¿Retirar el permiso de IA? La próxima vez que uses el escaneo o el asistente te lo volveremos a pedir.', { titulo: 'Retirar permiso', peligro: false }))) return;
    setOcupado(true);
    try {
      await retirarConsentimientosIA(userId);
      await alertar('Listo, retiramos tu permiso.', 'Listo');
    } catch (err) {
      await alertar(err.message, 'No se pudo');
    } finally {
      setOcupado(false);
    }
  };

  const eliminar = async () => {
    setOcupado(true);
    try {
      await eliminarCuenta(userId);
    } catch (err) {
      await alertar(err.message, 'No se pudo');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong>Privacidad</strong>
      <p className="dashboard__empty">
        Tus datos son solo tuyos. Puedes leer la política, retirar el permiso para usar IA o eliminar tu cuenta con todo lo que guardaste.
      </p>
      <Button type="button" variant="ghost" fullWidth onClick={() => setVerPolitica(true)}>
        Ver política de privacidad
      </Button>
      <Button type="button" variant="ghost" fullWidth disabled={ocupado} onClick={retirar}>
        Retirar permiso de IA
      </Button>
      <Button type="button" variant="danger" fullWidth disabled={ocupado} onClick={eliminar}>
        Eliminar mi cuenta
      </Button>
      <Modal open={verPolitica} onClose={() => setVerPolitica(false)} title="Política de privacidad">
        <PoliticaPrivacidad />
      </Modal>
    </section>
  );
}

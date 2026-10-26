import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { alertar } from '../../utils/dialogs';
import {
  pushSoportado,
  esAppInstalada,
  hayClavePush,
  estaSuscrito,
  activarPush,
  desactivarPush,
  enviarPrueba,
} from '../../utils/push';

// Activar, probar y desactivar las notificaciones de este dispositivo.
export function NotificationsSection({ userId }) {
  const [suscrito, setSuscrito] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const soportado = pushSoportado();

  useEffect(() => {
    if (soportado) estaSuscrito().then(setSuscrito).catch(() => {});
  }, [soportado]);

  const ejecutar = async (accion, exito) => {
    setOcupado(true);
    try {
      await accion();
      if (exito) await alertar(exito, 'Listo');
    } catch (err) {
      await alertar(err.message, 'No se pudo');
    } finally {
      setOcupado(false);
      if (soportado) estaSuscrito().then(setSuscrito).catch(() => {});
    }
  };

  let contenido;
  if (!soportado) {
    contenido = <p className="dashboard__empty">Este navegador no permite notificaciones. En iPhone, instala la app en la pantalla de inicio y ábrela desde ahí.</p>;
  } else if (!esAppInstalada()) {
    contenido = <p className="dashboard__empty">Abre la app desde el ícono de tu pantalla de inicio (no desde Safari) para activar las notificaciones.</p>;
  } else if (!hayClavePush()) {
    contenido = <p className="dashboard__empty">Falta configurar la clave de notificaciones (VITE_VAPID_PUBLIC_KEY) en la app.</p>;
  } else {
    contenido = (
      <>
        <p className="dashboard__empty">
          Recibirás el resumen de tu semana los lunes a las 8:00 y un aviso de los equipos que llevan 15 días sin venderse.
        </p>
        {suscrito ? (
          <>
            <Button type="button" fullWidth variant="ghost" disabled={ocupado} onClick={() => ejecutar(enviarPrueba, 'Te mandé una notificación de prueba. Debería llegar en unos segundos.')}>
              Enviarme una notificación de prueba
            </Button>
            <Button type="button" fullWidth variant="ghost" disabled={ocupado} onClick={() => ejecutar(desactivarPush, 'Notificaciones desactivadas en este dispositivo.')}>
              Desactivar en este dispositivo
            </Button>
          </>
        ) : (
          <Button type="button" fullWidth disabled={ocupado} onClick={() => ejecutar(() => activarPush(userId), 'Notificaciones activadas en este dispositivo.')}>
            Activar notificaciones
          </Button>
        )}
      </>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong>Notificaciones</strong>
      {contenido}
    </section>
  );
}

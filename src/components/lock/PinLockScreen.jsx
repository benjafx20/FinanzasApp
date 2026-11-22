import { useState, useEffect, useCallback, useRef } from 'react';
import { Delete, Lock } from 'lucide-react';
import { PIN_LARGO, estadoIntentos, verifyPin } from '../../utils/pinLock';
import './PinLockScreen.css';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Pantalla que tapa toda la app hasta poner el PIN correcto.
// `onForgot` debe cerrar la sesión local y quitar el PIN (devuelve una promesa;
// si lanza un error, se muestra aquí mismo).
export function PinLockScreen({ userId, onUnlock, onForgot }) {
  const [pin, setPin] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [espera, setEspera] = useState(() => {
    const e = estadoIntentos(userId);
    return e.bloqueado ? e.segundos : 0;
  });
  const [verificando, setVerificando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const [confirmandoOlvido, setConfirmandoOlvido] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  // El PIN en curso vive también en un ref: así dos toques seguidos muy rápidos
  // no se pisan y la verificación se lanza una sola vez.
  const pinRef = useRef('');
  const ocupadoRef = useRef(false);

  // Cuenta regresiva mientras dura el bloqueo por intentos fallidos.
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = window.setTimeout(() => {
      const e = estadoIntentos(userId);
      setEspera(e.bloqueado ? e.segundos : 0);
      if (!e.bloqueado) setMensaje('');
    }, 1000);
    return () => window.clearTimeout(t);
  }, [espera, userId]);

  const limpiar = () => {
    pinRef.current = '';
    setPin('');
  };

  const comprobar = useCallback(
    async (valor) => {
      ocupadoRef.current = true;
      setVerificando(true);
      try {
        const res = await verifyPin(userId, valor);
        if (res.ok) {
          onUnlock();
          return;
        }
        pinRef.current = '';
        setPin('');
        setSacudir(true);
        window.setTimeout(() => setSacudir(false), 400);
        if (res.bloqueado) {
          setEspera(res.segundos);
          setMensaje('Demasiados intentos.');
        } else {
          setMensaje(
            `PIN incorrecto. Te quedan ${res.intentosRestantes} ${res.intentosRestantes === 1 ? 'intento' : 'intentos'}.`
          );
        }
      } catch (err) {
        pinRef.current = '';
        setPin('');
        setMensaje(err.message || 'No se pudo verificar el PIN.');
      } finally {
        ocupadoRef.current = false;
        setVerificando(false);
      }
    },
    [userId, onUnlock]
  );

  const agregar = useCallback(
    (digito) => {
      if (espera > 0 || ocupadoRef.current || confirmandoOlvido) return;
      if (pinRef.current.length >= PIN_LARGO) return;
      setMensaje('');
      pinRef.current += digito;
      setPin(pinRef.current);
      if (pinRef.current.length === PIN_LARGO) comprobar(pinRef.current);
    },
    [espera, confirmandoOlvido, comprobar]
  );

  const borrar = useCallback(() => {
    if (espera > 0 || ocupadoRef.current || confirmandoOlvido) return;
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
  }, [espera, confirmandoOlvido]);

  // También funciona con teclado (computador).
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) agregar(e.key);
      else if (e.key === 'Backspace') borrar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agregar, borrar]);

  const olvide = async () => {
    setSaliendo(true);
    try {
      await onForgot();
    } catch (err) {
      setMensaje(err.message || 'No se pudo cerrar la sesión. Intenta de nuevo.');
      setConfirmandoOlvido(false);
    } finally {
      setSaliendo(false);
    }
  };

  const deshabilitado = espera > 0 || verificando;

  if (confirmandoOlvido) {
    return (
      <div className="pin-lock" role="dialog" aria-modal="true" aria-label="Olvidé mi PIN">
        <div className="pin-lock__box">
          <h1 className="pin-lock__title">Olvidé mi PIN</h1>
          <p className="pin-lock__text">
            Se cerrará tu sesión en este dispositivo y se quitará el PIN. Entras de nuevo con tu correo y contraseña, y
            ahí puedes poner otro PIN en Ajustes. Lo que tengas pendiente de subir no se pierde.
          </p>
          <button type="button" className="pin-lock__action" onClick={olvide} disabled={saliendo}>
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión y quitar el PIN'}
          </button>
          <button type="button" className="pin-lock__forgot" onClick={() => setConfirmandoOlvido(false)} disabled={saliendo}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pin-lock" role="dialog" aria-modal="true" aria-label="App bloqueada">
      <div className="pin-lock__box">
        <div className="pin-lock__icon">
          <Lock size={22} />
        </div>
        <h1 className="pin-lock__title">Ingresa tu PIN</h1>

        <div
          className={`pin-lock__dots ${sacudir ? 'pin-lock__dots--shake' : ''}`}
          role="img"
          aria-label={`${pin.length} de ${PIN_LARGO} dígitos`}
        >
          {Array.from({ length: PIN_LARGO }).map((_, i) => (
            <span key={i} className={`pin-lock__dot ${i < pin.length ? 'pin-lock__dot--on' : ''}`} />
          ))}
        </div>

        <p className="pin-lock__msg" role="alert">
          {espera > 0 ? `${mensaje} Espera ${espera} s para volver a intentar.`.trim() : mensaje}
        </p>

        <div className="pin-lock__pad">
          {TECLAS.map((t) => (
            <button key={t} type="button" className="pin-lock__key" onClick={() => agregar(t)} disabled={deshabilitado}>
              {t}
            </button>
          ))}
          <span />
          <button type="button" className="pin-lock__key" onClick={() => agregar('0')} disabled={deshabilitado}>
            0
          </button>
          <button
            type="button"
            className="pin-lock__key pin-lock__key--ghost"
            onClick={borrar}
            aria-label="Borrar"
            disabled={deshabilitado}
          >
            <Delete size={20} />
          </button>
        </div>

        <button type="button" className="pin-lock__forgot" onClick={() => { limpiar(); setConfirmandoOlvido(true); }}>
          Olvidé mi PIN
        </button>
      </div>
    </div>
  );
}

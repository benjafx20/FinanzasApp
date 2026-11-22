import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { alertar } from '../../utils/dialogs';
import { PIN_LARGO, EVENTO_PIN, hasPin, setPin, removePin, verifyPin, estadoIntentos } from '../../utils/pinLock';

const soloNumeros = (v) => v.replace(/\D/g, '').slice(0, PIN_LARGO);
const CAMPO_PIN = { type: 'password', inputMode: 'numeric', autoComplete: 'off', maxLength: PIN_LARGO, pattern: '[0-9]*' };

// Ajustes > Bloqueo con PIN: activar, cambiar o quitar.
export function PinSection({ userId }) {
  const [activo, setActivo] = useState(() => hasPin(userId));
  const [modo, setModo] = useState(null); // null | 'activar' | 'cambiar' | 'quitar'
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const onCambio = () => setActivo(hasPin(userId));
    window.addEventListener(EVENTO_PIN, onCambio);
    return () => window.removeEventListener(EVENTO_PIN, onCambio);
  }, [userId]);

  const cerrar = () => {
    setModo(null);
    setActual('');
    setNuevo('');
    setRepetir('');
    setError('');
  };

  const comprobarActual = async () => {
    const res = await verifyPin(userId, actual);
    if (res.ok) return true;
    setError(
      res.bloqueado
        ? `Demasiados intentos. Espera ${res.segundos} s.`
        : `PIN actual incorrecto. Te quedan ${res.intentosRestantes} ${res.intentosRestantes === 1 ? 'intento' : 'intentos'}.`
    );
    return false;
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if ((modo === 'cambiar' || modo === 'quitar') && estadoIntentos(userId).bloqueado) {
      setError(`Demasiados intentos. Espera ${estadoIntentos(userId).segundos} s.`);
      return;
    }
    if (modo !== 'quitar') {
      if (nuevo.length !== PIN_LARGO) return setError(`El PIN debe tener ${PIN_LARGO} números.`);
      if (nuevo !== repetir) return setError('Los dos PIN no coinciden.');
    }
    setGuardando(true);
    try {
      if (modo !== 'activar' && !(await comprobarActual())) return;
      if (modo === 'quitar') {
        removePin(userId);
        cerrar();
        await alertar('Listo: la app ya no pide PIN.', 'PIN quitado');
        return;
      }
      await setPin(userId, nuevo);
      cerrar();
      await alertar(
        modo === 'activar'
          ? 'La app pedirá el PIN al abrirla y cuando vuelvas a ella después de 1 minuto o más.'
          : 'Tu PIN se cambió.',
        modo === 'activar' ? 'PIN activado' : 'PIN cambiado'
      );
    } catch (err) {
      setError(err.message || 'No se pudo guardar el PIN.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <strong>Bloqueo con PIN</strong>
      {modo === null ? (
        <>
          <p className="dashboard__empty">
            {activo
              ? 'Activado. La app pide el PIN al abrirla y al volver a ella tras 1 minuto o más. El PIN se guarda solo en este dispositivo.'
              : 'Pon un PIN de 4 números para que nadie pueda ver tus finanzas si toma tu celular. Se guarda solo en este dispositivo.'}
          </p>
          {activo ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="primary" fullWidth onClick={() => setModo('cambiar')}>
                Cambiar PIN
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={() => setModo('quitar')}>
                Quitar PIN
              </Button>
            </div>
          ) : (
            <Button type="button" fullWidth onClick={() => setModo('activar')}>
              Activar PIN
            </Button>
          )}
        </>
      ) : (
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modo !== 'activar' && (
            <Input
              id="pin-actual"
              label="PIN actual"
              value={actual}
              onChange={(e) => setActual(soloNumeros(e.target.value))}
              {...CAMPO_PIN}
            />
          )}
          {modo !== 'quitar' && (
            <>
              <Input
                id="pin-nuevo"
                label={modo === 'cambiar' ? 'PIN nuevo' : 'PIN (4 números)'}
                value={nuevo}
                onChange={(e) => setNuevo(soloNumeros(e.target.value))}
                {...CAMPO_PIN}
              />
              <Input
                id="pin-repetir"
                label="Repite el PIN"
                value={repetir}
                onChange={(e) => setRepetir(soloNumeros(e.target.value))}
                {...CAMPO_PIN}
              />
            </>
          )}
          {error && (
            <span className="input-error" role="alert">
              {error}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="ghost" fullWidth onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth disabled={guardando}>
              {modo === 'quitar' ? 'Quitar PIN' : 'Guardar PIN'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

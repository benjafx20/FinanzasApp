import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { hasPin, removePin, BLOQUEO_TRAS_MS, EVENTO_PIN } from '../../utils/pinLock';
import { PinLockScreen } from './PinLockScreen';

// Envuelve la app. Si hay PIN, la tapa:
//   - al abrir la app desde cero (startLocked), pero no justo después de escribir
//     correo y contraseña,
//   - y cada vez que vuelves a ella tras 60 segundos o más en segundo plano.
// La app de abajo sigue montada (no pierde lo que tenías abierto ni deja de
// sincronizar), solo queda tapada e inactiva.
export function PinGate({ userId, startLocked = true, children }) {
  const [enabled, setEnabled] = useState(() => hasPin(userId));
  const [locked, setLocked] = useState(() => startLocked && hasPin(userId));
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    const onCambio = () => {
      const hay = hasPin(userId);
      setEnabled(hay);
      if (!hay) setLocked(false);
    };
    window.addEventListener(EVENTO_PIN, onCambio);
    return () => window.removeEventListener(EVENTO_PIN, onCambio);
  }, [userId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const desde = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (desde && Date.now() - desde >= BLOQUEO_TRAS_MS && hasPin(userId)) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [userId]);

  const onUnlock = useCallback(() => setLocked(false), []);

  // "Olvidé mi PIN": se cierra la sesión en este dispositivo y se quita el PIN.
  // scope "local": cierra la sesión solo aquí y no necesita conexión.
  const onForgot = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('No se pudo cerrar la sesión. Intenta de nuevo.');
    removePin(userId);
  }, [userId]);

  const bloqueada = enabled && locked;

  return (
    <>
      <div style={{ display: 'contents' }} inert={bloqueada} aria-hidden={bloqueada ? 'true' : undefined}>
        {children}
      </div>
      {bloqueada && <PinLockScreen userId={userId} onUnlock={onUnlock} onForgot={onForgot} />}
    </>
  );
}

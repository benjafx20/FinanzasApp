import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, withSessionRetry } from '../lib/supabaseClient';
import { syncPendingOps } from '../utils/syncPendingOps';
import { resumenCola, descartarFallidas, EVENTO_COLA } from '../utils/offlineOps';

const CADA_MS = 20_000;

// Sube solo lo que se hizo sin conexión (ingresos, aportes y ahorro). Corre al
// abrir la app, al volver la señal, al volver a la app y cada 20 s mientras quede
// algo pendiente. Cuando sube algo, llama a `onSynced` para recargar las listas.
export function usePendingSync(userId, { onSynced } = {}) {
  const [resumen, setResumen] = useState(() => resumenCola(userId));
  const [sincronizando, setSincronizando] = useState(false);
  const ocupadoRef = useRef(false);
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  });

  const refrescar = useCallback(() => setResumen(resumenCola(userId)), [userId]);

  const sincronizar = useCallback(async () => {
    if (!userId || ocupadoRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const { total, fallidas } = resumenCola(userId);
    if (total === fallidas) return; // nada que valga la pena intentar
    ocupadoRef.current = true;
    setSincronizando(true);
    try {
      const res = await syncPendingOps(userId, supabase, withSessionRetry);
      if (res.subidas > 0) await onSyncedRef.current?.(res);
    } catch (err) {
      console.error('[usePendingSync]', err);
    } finally {
      ocupadoRef.current = false;
      setSincronizando(false);
      refrescar();
    }
  }, [userId, refrescar]);

  useEffect(() => {
    refrescar();
    sincronizar();
    const alVolver = () => {
      if (document.visibilityState === 'visible') sincronizar();
    };
    window.addEventListener('online', sincronizar);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener(EVENTO_COLA, refrescar);
    const timer = window.setInterval(() => {
      if (resumenCola(userId).total > 0) sincronizar();
    }, CADA_MS);
    return () => {
      window.removeEventListener('online', sincronizar);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener(EVENTO_COLA, refrescar);
      window.clearInterval(timer);
    };
  }, [userId, sincronizar, refrescar]);

  // Quita lo que el servidor rechazó una y otra vez. Devuelve cuántas operaciones quitó.
  const descartar = useCallback(async () => {
    const n = descartarFallidas(userId);
    refrescar();
    await onSyncedRef.current?.({ subidas: 0, descartadas: n });
    return n;
  }, [userId, refrescar]);

  return { ...resumen, sincronizando, sincronizar, descartar };
}

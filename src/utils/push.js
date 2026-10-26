import { supabase } from '../lib/supabaseClient';

// La clave pública va en el código (es pública). VITE_VAPID_PUBLIC_KEY la reemplaza si existe.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BIcJEEXqQyoUX0idjdm1j0z_opl-dXyPGQQeq8P1ZCt9INU2nKbtdZkvvXF1B0Dv2jCYqe1erIyv7E96dohAdBc';

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// En iPhone las notificaciones solo funcionan con la app instalada en la
// pantalla de inicio (no desde Safari).
export function esAppInstalada() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export const hayClavePush = () => !!VAPID_PUBLIC_KEY;

function claveABytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(b64);
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)));
}

export async function estaSuscrito() {
  if (!pushSoportado()) return false;
  const reg = await navigator.serviceWorker.ready;
  return !!(await reg.pushManager.getSubscription());
}

export async function activarPush(userId) {
  if (!hayClavePush()) throw new Error('Falta la clave VITE_VAPID_PUBLIC_KEY en la configuración de la app.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('No diste permiso para las notificaciones. Puedes activarlo en Ajustes del iPhone.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLIC_KEY) });
  }
  const datos = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error('No se pudo guardar este dispositivo. ¿Corriste el SQL de Supabase?');
}

export async function desactivarPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

// Pide al servidor que envíe una notificación de prueba a tus dispositivos.
export async function enviarPrueba() {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { test: true } });
  if (error) throw new Error('No se pudo contactar la función de notificaciones. ¿Está desplegada send-push?');
  if (data && data.ok === false) throw new Error(data.error || 'No se pudo enviar la prueba.');
  return data;
}

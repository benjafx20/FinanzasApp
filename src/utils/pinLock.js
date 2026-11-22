// Bloqueo con PIN de 4 dígitos.
//
// El PIN NUNCA se guarda: solo un hash SHA-256 con sal aleatoria, y únicamente en
// ESTE dispositivo (localStorage). No viaja a Supabase. Es una barrera contra
// alguien que tome el celular desbloqueado, no un cifrado de los datos.
//
// Intentos: 5 PIN incorrectos seguidos bloquean 30 segundos. El conteo se guarda
// en el dispositivo, así que cerrar y abrir la app no lo reinicia.
export const PIN_LARGO = 4;
export const MAX_INTENTOS = 5;
export const ESPERA_MS = 30_000;
// Tiempo en segundo plano tras el cual la app vuelve a pedir el PIN.
export const BLOQUEO_TRAS_MS = 60_000;
export const EVENTO_PIN = 'finanzas-pin-changed';

const keyPin = (userId) => `finanzas_pin_${userId}`;
const keyEstado = (userId) => `finanzas_pin_state_${userId}`;

const esPinValido = (pin) => typeof pin === 'string' && /^\d{4}$/.test(pin);

const aHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

async function calcularHash(sal, pin) {
  const subtle = globalThis.crypto?.subtle;
  // crypto.subtle solo existe en páginas seguras (https). La app se publica en https.
  if (!subtle) throw new Error('Este navegador no permite guardar un PIN de forma segura.');
  const datos = new TextEncoder().encode(`${sal}:${pin}`);
  return aHex(await subtle.digest('SHA-256', datos));
}

function leer(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function avisarCambio() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_PIN));
}

export function hasPin(userId) {
  if (!userId) return false;
  const guardado = leer(keyPin(userId));
  return !!(guardado && guardado.sal && guardado.hash);
}

export async function setPin(userId, pin) {
  if (!userId) throw new Error('Debes iniciar sesión.');
  if (!esPinValido(pin)) throw new Error(`El PIN debe tener ${PIN_LARGO} números.`);
  const sal = aHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const hash = await calcularHash(sal, pin);
  if (!escribir(keyPin(userId), { sal, hash })) {
    throw new Error('No se pudo guardar el PIN en este dispositivo.');
  }
  escribir(keyEstado(userId), null);
  avisarCambio();
}

export function removePin(userId) {
  if (!userId) return;
  escribir(keyPin(userId), null);
  escribir(keyEstado(userId), null);
  avisarCambio();
}

// Estado de bloqueo por intentos fallidos. `ahora` se puede inyectar en pruebas.
export function estadoIntentos(userId, ahora = Date.now()) {
  const estado = leer(keyEstado(userId)) || {};
  const hasta = Number(estado.bloqueadoHasta) || 0;
  const fallos = Number(estado.fallos) || 0;
  if (hasta > ahora) {
    return { bloqueado: true, segundos: Math.ceil((hasta - ahora) / 1000), intentosRestantes: 0 };
  }
  return { bloqueado: false, segundos: 0, intentosRestantes: Math.max(0, MAX_INTENTOS - fallos) };
}

// Devuelve { ok: true } o { ok: false, bloqueado, segundos, intentosRestantes }.
export async function verifyPin(userId, pin, ahora = Date.now()) {
  const actual = estadoIntentos(userId, ahora);
  if (actual.bloqueado) return { ok: false, ...actual };

  const guardado = leer(keyPin(userId));
  if (!guardado || !esPinValido(pin)) return { ok: false, ...actual };

  const hash = await calcularHash(guardado.sal, pin);
  if (hash === guardado.hash) {
    escribir(keyEstado(userId), null);
    return { ok: true };
  }

  const fallos = (Number((leer(keyEstado(userId)) || {}).fallos) || 0) + 1;
  if (fallos >= MAX_INTENTOS) {
    // Tras el castigo se vuelve a empezar con los 5 intentos completos.
    escribir(keyEstado(userId), { fallos: 0, bloqueadoHasta: ahora + ESPERA_MS });
    return { ok: false, bloqueado: true, segundos: Math.ceil(ESPERA_MS / 1000), intentosRestantes: 0 };
  }
  escribir(keyEstado(userId), { fallos, bloqueadoHasta: 0 });
  return { ok: false, bloqueado: false, segundos: 0, intentosRestantes: MAX_INTENTOS - fallos };
}

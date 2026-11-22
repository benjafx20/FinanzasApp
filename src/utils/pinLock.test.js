// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { hasPin, setPin, verifyPin, removePin, estadoIntentos, MAX_INTENTOS, ESPERA_MS } from './pinLock';

const U = 'user-1';

beforeEach(() => localStorage.clear());

describe('pinLock', () => {
  it('guarda solo un hash con sal, nunca el PIN', async () => {
    await setPin(U, '4821');
    expect(hasPin(U)).toBe(true);
    const crudo = localStorage.getItem(`finanzas_pin_${U}`);
    expect(crudo).not.toContain('4821');
    const { sal, hash } = JSON.parse(crudo);
    expect(sal).toHaveLength(32);
    expect(hash).toHaveLength(64);
  });

  it('la misma clave con otra sal da otro hash', async () => {
    await setPin(U, '1234');
    const a = localStorage.getItem(`finanzas_pin_${U}`);
    await setPin(U, '1234');
    const b = localStorage.getItem(`finanzas_pin_${U}`);
    expect(JSON.parse(a).hash).not.toBe(JSON.parse(b).hash);
  });

  it('rechaza PIN que no son 4 números', async () => {
    await expect(setPin(U, '12')).rejects.toThrow();
    await expect(setPin(U, 'abcd')).rejects.toThrow();
    await expect(setPin(U, '12345')).rejects.toThrow();
    expect(hasPin(U)).toBe(false);
  });

  it('acepta el PIN correcto y rechaza el incorrecto contando intentos', async () => {
    await setPin(U, '0007');
    expect((await verifyPin(U, '0007')).ok).toBe(true);
    const mal = await verifyPin(U, '1111');
    expect(mal).toMatchObject({ ok: false, bloqueado: false, intentosRestantes: MAX_INTENTOS - 1 });
  });

  it('un acierto reinicia el conteo de fallos', async () => {
    await setPin(U, '0007');
    await verifyPin(U, '1111');
    await verifyPin(U, '1111');
    await verifyPin(U, '0007');
    expect(estadoIntentos(U).intentosRestantes).toBe(MAX_INTENTOS);
  });

  it('5 fallos bloquean 30 s, incluso con el PIN correcto, y luego se puede de nuevo', async () => {
    await setPin(U, '0007');
    const t0 = 1_000_000;
    let ultimo;
    for (let i = 0; i < MAX_INTENTOS; i++) ultimo = await verifyPin(U, '9999', t0);
    expect(ultimo).toMatchObject({ ok: false, bloqueado: true, segundos: 30 });

    // Durante la espera ni el PIN correcto entra.
    const durante = await verifyPin(U, '0007', t0 + 10_000);
    expect(durante.ok).toBe(false);
    expect(durante.bloqueado).toBe(true);
    expect(durante.segundos).toBe(20);

    // Pasada la espera, vuelve a funcionar y con los 5 intentos completos.
    expect(estadoIntentos(U, t0 + ESPERA_MS + 1).bloqueado).toBe(false);
    expect(estadoIntentos(U, t0 + ESPERA_MS + 1).intentosRestantes).toBe(MAX_INTENTOS);
    expect((await verifyPin(U, '0007', t0 + ESPERA_MS + 1)).ok).toBe(true);
  });

  it('el bloqueo sobrevive a cerrar y abrir la app (queda en el dispositivo)', async () => {
    await setPin(U, '0007');
    for (let i = 0; i < MAX_INTENTOS; i++) await verifyPin(U, '9999', 5_000);
    // "Reabrir": nada en memoria, solo localStorage.
    expect(estadoIntentos(U, 6_000).bloqueado).toBe(true);
  });

  it('removePin borra PIN y estado; cada usuario tiene el suyo', async () => {
    await setPin(U, '1111');
    await setPin('user-2', '2222');
    removePin(U);
    expect(hasPin(U)).toBe(false);
    expect(hasPin('user-2')).toBe(true);
    expect((await verifyPin('user-2', '2222')).ok).toBe(true);
  });
});

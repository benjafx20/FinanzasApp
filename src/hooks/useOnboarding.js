import { useState, useEffect } from 'react';

function storageKey(userId) {
  return `finanzas_onboarding_seen_${userId}`;
}

// Nota: se guarda en localStorage del navegador, no en Supabase.
// Si el usuario entra desde otro dispositivo, verá el onboarding de nuevo.
// Para MVP es suficiente; si más adelante quieres que sea por cuenta
// (sincronizado entre dispositivos), se puede mover a una columna en el perfil.
export function useOnboarding(userId) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const seen = localStorage.getItem(storageKey(userId));
    if (!seen) setShow(true);
  }, [userId]);

  const finish = () => {
    if (userId) localStorage.setItem(storageKey(userId), 'true');
    setShow(false);
  };

  const replay = () => setShow(true);

  return { show, finish, replay };
}

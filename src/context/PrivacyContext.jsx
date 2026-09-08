import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'finanzas_amounts_hidden';
const PrivacyContext = createContext(null);

// "Modo lectura" para cuando prestas el celular: oculta los montos en
// toda la app con un toggle, sin cerrar sesión ni perder nada. Se guarda
// en localStorage para que, si el celular se recarga mientras lo tiene
// otra persona, los montos sigan ocultos (por seguridad, el valor por
// defecto es "no oculto" — el dueño lo activa a mano antes de prestarlo).
export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
    } catch {
      // Si no se puede guardar, el toggle sigue funcionando en la sesión.
    }
  }, [hidden]);

  const toggleHidden = useCallback(() => setHidden((v) => !v), []);

  return (
    <PrivacyContext.Provider value={{ hidden, toggleHidden }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- patrón estándar de Context (Provider + hook en el mismo archivo)
export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy debe usarse dentro de <PrivacyProvider>');
  return ctx;
}

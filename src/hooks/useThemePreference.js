import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'finanzas_theme_preference';

function getSystemPreference() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Maneja el tema claro/oscuro elegido a mano por el usuario (con switch en
// el header). Si nunca lo ha tocado, parte según la preferencia del
// sistema; apenas usa el switch, esa elección queda guardada y manda por
// sobre el sistema de ahí en adelante.
export function useThemePreference() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || getSystemPreference();
    } catch {
      return getSystemPreference();
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Si localStorage no está disponible, el switch sigue funcionando
        // en esta sesión, solo no se recuerda la próxima vez.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

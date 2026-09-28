import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PALETTE } from '../utils/palettes';

const THEME_KEY = 'finanzas_theme_preference';
const PALETTE_KEY = 'finanzas_palette_preference';
const ThemeContext = createContext(null);

// Color de la barra del navegador/PWA para cada paleta, en su variante
// clara y oscura (debe coincidir con --color-primary-dark / --color-bg
// oscuro de cada paleta en theme.css).
const CHROME_COLORS = {
  morado: { light: '#6B3FD9', dark: '#17121F' },
  vino: { light: '#7A1F3D', dark: '#1A0E13' },
  oceano: { light: '#0F6E73', dark: '#0B1B1C' },
  carbon: { light: '#3A4756', dark: '#14181D' },
};

// Fuente única de verdad de tema (claro/oscuro) Y paleta de colores.
// La comparten: el switch claro/oscuro del header, el selector de
// paletas, y cualquier componente que necesite saber qué colores usar
// "a mano" (ej: los gráficos de recharts, que no leen variables CSS).
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [palette, setPaletteState] = useState(() => {
    try {
      return localStorage.getItem(PALETTE_KEY) || DEFAULT_PALETTE;
    } catch {
      return DEFAULT_PALETTE;
    }
  });

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const savedPalette = localStorage.getItem(PALETTE_KEY);

      if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
      if (savedPalette && ['morado', 'vino', 'oceano', 'carbon'].includes(savedPalette)) {
        setPaletteState(savedPalette);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    const color = CHROME_COLORS[palette]?.[theme];
    if (!color) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', color);
    });
  }, [palette, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // Si localStorage no está disponible, el switch sigue funcionando
        // en esta sesión, solo no se recuerda la próxima vez.
      }
      return next;
    });
  }, []);

  const setPalette = useCallback((next) => {
    setPaletteState(next);
    try {
      localStorage.setItem(PALETTE_KEY, next);
    } catch {
      // Igual que con el tema: sigue funcionando en la sesión aunque no
      // se pueda guardar la preferencia.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- patrón estándar de Context (Provider + hook en el mismo archivo)
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

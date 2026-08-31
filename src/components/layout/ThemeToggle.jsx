import { Sun, Moon } from 'lucide-react';
import { useThemePreference } from '../../hooks/useThemePreference';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemePreference();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
        </span>
      </span>
    </button>
  );
}

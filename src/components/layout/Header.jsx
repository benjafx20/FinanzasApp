import { Search, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PaletteSwitcher } from './PaletteSwitcher';
import { Amount } from '../ui/Amount';
import { usePrivacy } from '../../context/PrivacyContext';
import './Header.css';

export function Header({ totalMes, totalSemana, balance, onSignOut, onShowHelp, onShowSearch }) {
  const balancePositivo = balance >= 0;
  const { hidden, toggleHidden } = usePrivacy();

  return (
    <header className="app-header">
      <div className="app-header__top">
        <span className="app-header__brand">👛 Mis Finanzas</span>
        <div className="app-header__actions">
          <button
            className="app-header__help"
            onClick={toggleHidden}
            aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos (modo lectura)'}
          >
            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button className="app-header__help" onClick={onShowSearch} aria-label="Buscar">
            <Search size={13} />
          </button>
          <PaletteSwitcher />
          <ThemeToggle />
          <button className="app-header__help" onClick={onShowHelp} aria-label="Ver tutorial">?</button>
          <button className="app-header__logout" onClick={onSignOut}>Salir</button>
        </div>
      </div>
      <div className="app-header__summary">
        <div>
          <span className="app-header__label">Gastado este mes</span>
          <span className="app-header__total"><Amount value={totalMes} /></span>
        </div>
        <div className="app-header__divider" />
        <div>
          <span className="app-header__label">Esta semana</span>
          <span className="app-header__semana"><Amount value={totalSemana} /></span>
        </div>
      </div>
      <div className={`app-header__balance ${balancePositivo ? '' : 'app-header__balance--negativo'}`}>
        <span>Balance total</span>
        <strong><Amount value={balance} /></strong>
      </div>
    </header>
  );
}

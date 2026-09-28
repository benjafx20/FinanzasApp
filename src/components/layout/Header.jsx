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

      <div className="app-header__content">
        <div className="app-header__primary">
          <p className="app-header__balance-label">Balance total</p>
          <p className={`app-header__balance-hero ${balancePositivo ? '' : 'app-header__balance-hero--negativo'}`}>
            <Amount value={balance} />
          </p>
        </div>

        <div className="app-header__summary">
          <div className="app-header__chip app-header__chip--highlight">
            <span>Este mes</span>
            <b><Amount value={totalMes} /></b>
          </div>
          <div className="app-header__chip">
            <span>Esta semana</span>
            <b><Amount value={totalSemana} /></b>
          </div>
        </div>
      </div>
    </header>
  );
}

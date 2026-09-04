import { formatCurrency } from '../../utils/formatCurrency';
import { ThemeToggle } from './ThemeToggle';
import { PaletteSwitcher } from './PaletteSwitcher';
import './Header.css';

export function Header({ totalMes, totalSemana, balance, onSignOut, onShowHelp }) {
  const balancePositivo = balance >= 0;

  return (
    <header className="app-header">
      <div className="app-header__top">
        <span className="app-header__brand">👛 Mis Finanzas</span>
        <div className="app-header__actions">
          <PaletteSwitcher />
          <ThemeToggle />
          <button className="app-header__help" onClick={onShowHelp} aria-label="Ver tutorial">?</button>
          <button className="app-header__logout" onClick={onSignOut}>Salir</button>
        </div>
      </div>
      <div className="app-header__summary">
        <div>
          <span className="app-header__label">Gastado este mes</span>
          <span className="app-header__total">{formatCurrency(totalMes)}</span>
        </div>
        <div className="app-header__divider" />
        <div>
          <span className="app-header__label">Esta semana</span>
          <span className="app-header__semana">{formatCurrency(totalSemana)}</span>
        </div>
      </div>
      <div className={`app-header__balance ${balancePositivo ? '' : 'app-header__balance--negativo'}`}>
        <span>Balance total</span>
        <strong>{formatCurrency(balance)}</strong>
      </div>
    </header>
  );
}

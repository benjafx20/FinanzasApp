import './FAB.css';

export function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Registrar nuevo gasto">
      <span className="fab__plus" aria-hidden="true">+</span>
    </button>
  );
}

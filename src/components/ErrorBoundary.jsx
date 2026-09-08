import { Component } from 'react';
import './ErrorBoundary.css';

// Red de seguridad: si algo revienta en cualquier parte del árbol de
// React (como el bug real que encontramos: un dato inesperado tumbando
// toda la app sin aviso), esto lo atrapa y muestra un mensaje con un
// botón para recargar, en vez de dejar la pantalla completamente en
// blanco sin ninguna pista de qué pasó.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Queda en la consola por si el usuario nos manda una captura o los
    // logs — no hay backend de reporte de errores todavía.
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <span className="error-boundary__icon" aria-hidden="true">😵‍💫</span>
          <h1 className="error-boundary__title">Algo salió mal</h1>
          <p className="error-boundary__texto">
            Ocurrió un error inesperado. Tus datos están a salvo (todo se guarda en la nube),
            pero esta pantalla se tiene que recargar para seguir.
          </p>
          <button className="error-boundary__btn" onClick={this.handleReload}>
            Recargar la app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

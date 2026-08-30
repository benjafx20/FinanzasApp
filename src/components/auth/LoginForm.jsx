import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function LoginForm({ onSubmit, onSwitchToSignup, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input
        id="login-email"
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        required
        autoComplete="email"
      />
      <Input
        id="login-password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar'}
      </Button>
      <button type="button" className="auth-switch" onClick={onForgotPassword}>
        ¿Olvidaste tu contraseña?
      </button>
      <button type="button" className="auth-switch" onClick={onSwitchToSignup}>
        ¿No tienes cuenta? <strong>Regístrate</strong>
      </button>
    </form>
  );
}

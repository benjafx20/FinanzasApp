import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function SignupForm({ onSubmit, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
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
        id="signup-email"
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        required
        autoComplete="email"
      />
      <Input
        id="signup-password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mínimo 6 caracteres"
        required
        minLength={6}
        autoComplete="new-password"
      />
      <Input
        id="signup-confirm"
        label="Confirmar contraseña"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="new-password"
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
      <button type="button" className="auth-switch" onClick={onSwitchToLogin}>
        ¿Ya tienes cuenta? <strong>Ingresa</strong>
      </button>
    </form>
  );
}

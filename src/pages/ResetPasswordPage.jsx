import { useState } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import './AuthPage.css';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-emoji" aria-hidden="true">🔒</span>
          <h1 className="auth-title">Nueva contraseña</h1>
          <p className="auth-subtitle">Define una contraseña nueva para tu cuenta</p>
        </div>

        {listo ? (
          <div className="auth-success">
            <p>Contraseña actualizada. Ya puedes seguir usando la app con tu contraseña nueva.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              id="reset-password"
              label="Contraseña nueva"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              id="reset-confirm"
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
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

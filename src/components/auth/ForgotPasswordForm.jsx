import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function ForgotPasswordForm({ onSubmit, onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(email);
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="auth-success">
        <p>Si ese correo tiene una cuenta, te llegará un link para crear una contraseña nueva. Revisa tu bandeja (y spam).</p>
        <button type="button" className="auth-switch" onClick={onBack}>Volver a ingresar</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <p className="auth-subtitle" style={{ marginBottom: 4 }}>
        Ingresa tu correo y te mandamos un link para recuperar tu cuenta.
      </p>
      <Input
        id="forgot-email"
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        required
        autoComplete="email"
      />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar link de recuperación'}
      </Button>
      <button type="button" className="auth-switch" onClick={onBack}>Volver a ingresar</button>
    </form>
  );
}

import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { useAuth } from '../hooks/useAuth';
import './AuthPage.css';

export function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignup = async (email, password) => {
    await signUp(email, password);
    setSignupSuccess(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-spotlight" aria-label="Resumen de la aplicación">
          <span className="auth-spotlight__badge">Finanzas personales</span>
          <h2>Tu dinero, claro y bajo control.</h2>
          <p>
            Organiza tus gastos, metas y deudas sin líos y con una vista mucho más clara
            de lo que entra y sale cada semana.
          </p>

          <div className="auth-spotlight__grid">
            <div className="auth-spotlight__item">
              <span aria-hidden="true">💸</span>
              <strong>Gastos</strong>
              <small>por categoría</small>
            </div>
            <div className="auth-spotlight__item">
              <span aria-hidden="true">🎯</span>
              <strong>Metas</strong>
              <small>en seguimiento</small>
            </div>
            <div className="auth-spotlight__item">
              <span aria-hidden="true">🧾</span>
              <strong>Balance</strong>
              <small>cada mes</small>
            </div>
          </div>
        </aside>

        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-emoji" aria-hidden="true">💜</span>
            <h1 className="auth-title">Mis Finanzas</h1>
            <p className="auth-subtitle">Registra tus gastos sin complicarte</p>
          </div>

          {signupSuccess ? (
            <div className="auth-success">
              <p>Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.</p>
              <button className="auth-switch" onClick={() => { setSignupSuccess(false); setMode('login'); }}>
                Ir a ingresar
              </button>
            </div>
          ) : mode === 'login' ? (
            <LoginForm
              onSubmit={signIn}
              onSwitchToSignup={() => setMode('signup')}
              onForgotPassword={() => setMode('forgot')}
            />
          ) : mode === 'forgot' ? (
            <ForgotPasswordForm onSubmit={sendPasswordReset} onBack={() => setMode('login')} />
          ) : (
            <SignupForm onSubmit={handleSignup} onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  );
}

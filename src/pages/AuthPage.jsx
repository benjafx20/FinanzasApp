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
  );
}

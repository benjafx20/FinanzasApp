import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function App() {
  const { user, loading, passwordRecovery } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-ink-soft)' }}>
        Cargando…
      </div>
    );
  }

  // Prioridad sobre todo lo demás: si entró desde el link de recuperación
  // de contraseña, debe definir una nueva antes de seguir usando la app.
  if (passwordRecovery) return <ResetPasswordPage />;

  return user ? <Dashboard /> : <AuthPage />;
}

export default App;

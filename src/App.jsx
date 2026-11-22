import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PinGate } from './components/lock/PinGate';

function App() {
  const { user, loading, passwordRecovery, sesionRestaurada } = useAuth();

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

  if (!user) return <AuthPage />;

  // key={user.id}: si cambia la cuenta, el portero parte de cero con el PIN de esa cuenta.
  return (
    <PinGate key={user.id} userId={user.id} startLocked={sesionRestaurada}>
      <Dashboard />
    </PinGate>
  );
}

export default App;

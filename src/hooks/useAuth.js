import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Supabase dispara este evento cuando el usuario entra desde el link
      // de "recuperar contraseña" que le llegó al correo.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(traducirErrorAuth(error));
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traducirErrorAuth(error));
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('No se pudo cerrar sesión. Intenta de nuevo.');
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error('No se pudo enviar el correo de recuperación. Revisa el correo ingresado.');
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error('No se pudo actualizar la contraseña. Intenta de nuevo.');
    setPasswordRecovery(false);
  }, []);

  return {
    user,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
  };
}

// Traduce errores comunes de Supabase Auth a mensajes en español
function traducirErrorAuth(error) {
  const msg = error.message?.toLowerCase() || '';
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('user already registered')) return 'Ya existe una cuenta con ese correo.';
  if (msg.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('invalid email')) return 'El formato del correo no es válido.';
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Revisa tu archivo .env (copia .env.example y completa los valores).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Si la sesión quedó vencida (ej: la app estuvo cerrada o en segundo plano
// mucho rato), la primera consulta después de abrir puede fallar con 401
// antes de que el token se alcance a refrescar. `withSessionRetry` detecta
// ese caso puntual, refresca la sesión, y reintenta la consulta UNA vez.
// Cualquier otro error (de red, de RLS por otro motivo, etc.) se deja pasar
// tal cual para que el hook que llamó lo muestre normalmente.
function esErrorDeSesionVencida(error) {
  if (!error) return false;
  if (error.status === 401) return true;
  const msg = error.message?.toLowerCase() || '';
  return msg.includes('jwt') || msg.includes('token is expired') || msg.includes('invalid claim');
}

export async function withSessionRetry(queryFn) {
  const first = await queryFn();
  if (!first.error || !esErrorDeSesionVencida(first.error)) return first;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return first; // no se pudo refrescar: devuelve el error original

  return queryFn();
}

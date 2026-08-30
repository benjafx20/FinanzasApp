import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// En el celular, cuando dejas la app en segundo plano un rato, el navegador
// pausa los temporizadores — incluido el que renueva la sesión de Supabase
// antes de que venza. Al volver, la sesión puede estar vencida y las
// peticiones fallan silenciosamente (por eso "a veces no carga" y hay que
// cerrar y volver a abrir). Este hook detecta cuando la pestaña/app vuelve
// a estar visible, refresca la sesión, y vuelve a pedir los datos.
export function useRefetchOnFocus(refetchFns) {
  const refetchFnsRef = useRef(refetchFns);
  refetchFnsRef.current = refetchFns;

  useEffect(() => {
    let lastRun = 0;

    const refrescarTodo = async () => {
      // Evita disparar varias veces seguidas si llegan varios eventos juntos.
      const ahora = Date.now();
      if (ahora - lastRun < 2000) return;
      lastRun = ahora;

      try {
        await supabase.auth.refreshSession();
      } catch {
        // Si falla el refresco de sesión, igual intentamos recargar los
        // datos — si la sesión de verdad venció, cada hook mostrará su
        // propio error y el usuario deberá volver a iniciar sesión.
      }
      refetchFnsRef.current.forEach((fn) => fn?.());
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refrescarTodo();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', refrescarTodo);
    window.addEventListener('online', refrescarTodo);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', refrescarTodo);
      window.removeEventListener('online', refrescarTodo);
    };
  }, []);
}

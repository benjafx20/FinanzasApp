import { useState, useEffect } from 'react';

// Sigue el estado real de conexión del navegador. `navigator.onLine` puede
// dar falsos positivos (dice "online" aunque no haya internet real, solo
// detecta si hay una red conectada), pero para avisar "estás sin conexión"
// es suficiente y no requiere pedir nada al servidor.
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

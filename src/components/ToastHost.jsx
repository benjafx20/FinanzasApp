import { useEffect, useState } from 'react';
import { registerToastHost } from '../utils/toasts';

// Aviso abajo con botón de acción (ej. "Deshacer") que desaparece solo.
export function ToastHost() {
  const [toast, setToast] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => registerToastHost((nuevo) => setToast(nuevo)), []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), toast.duracion);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const accionar = async () => {
    setOcupado(true);
    try {
      await toast.alAccionar?.();
    } finally {
      setOcupado(false);
      setToast(null);
    }
  };

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-ink)',
        color: 'var(--color-surface)',
        fontSize: 14,
        boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
      }}
    >
      <span>{toast.mensaje}</span>
      {toast.accion && (
        <button
          type="button"
          onClick={accionar}
          disabled={ocupado}
          style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, textTransform: 'uppercase', fontSize: 13 }}
        >
          {ocupado ? '…' : toast.accion}
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { alertar } from '../../utils/dialogs';
import { hoyISO } from '../../utils/dates';
import { construirHojas, descargarExcel } from '../../utils/exportData';
import { NotificationsSection } from './NotificationsSection';

// Ajustes: respaldo de datos en Excel y notificaciones.
export function SettingsModal({ open, onClose, userId, datos }) {
  const [exportando, setExportando] = useState(false);

  const exportar = async () => {
    setExportando(true);
    try {
      const fecha = hoyISO();
      const hojas = construirHojas({ ...datos, fechaRespaldo: fecha });
      await descargarExcel(hojas, `finanzas-respaldo-${fecha}.xlsx`);
    } catch (err) {
      await alertar('No se pudo generar el Excel. Intenta de nuevo.', 'No se pudo');
      console.error('[SettingsModal] exportar:', err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajustes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>Respaldo de tus datos</strong>
          <p className="dashboard__empty">
            Descarga un Excel con todo: gastos, ingresos, aportes, movimientos, metas, deudas, recurrentes y presupuestos
            (cada uno en su hoja). No incluye las fotos de las boletas.
          </p>
          <Button type="button" fullWidth disabled={exportando} onClick={exportar}>
            {exportando ? 'Generando…' : 'Descargar Excel'}
          </Button>
        </section>
        <NotificationsSection userId={userId} />
      </div>
    </Modal>
  );
}

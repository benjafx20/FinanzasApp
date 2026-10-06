import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Modal } from '../ui/Modal';
import { CategoryIcon } from '../../utils/CategoryIcon';
import { Amount } from '../ui/Amount';
import './ExpenseCard.css';

export function ExpenseCard({ expense, onEdit, onDelete }) {
  const [boletaUrl, setBoletaUrl] = useState(null);
  const [abriendo, setAbriendo] = useState(false);
  const cat = expense.categories;
  const color = cat?.color || '#6B7280';
  const nombre = cat?.nombre || 'Sin categoría';
  const fecha = new Date(expense.fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });

  const verBoleta = async () => {
    setAbriendo(true);
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(expense.receipt_path, 300);
    setAbriendo(false);
    if (error || !data?.signedUrl) {
      alert('No se pudo abrir la foto de la boleta.');
      return;
    }
    setBoletaUrl(data.signedUrl);
  };

  return (
    <div className="ticket">
      <button
        className="ticket__main ticket__main--clickable"
        onClick={() => onEdit(expense)}
        aria-label={`Editar gasto de ${nombre}`}
      >
        <div className="ticket__icon" style={{ background: `${color}22`, color }}>
          <CategoryIcon name={cat?.icono} size={18} />
        </div>
        <div className="ticket__info">
          <span className="ticket__category">{nombre}</span>
          {expense.etiqueta && <span className="ticket__etiqueta">{expense.etiqueta}</span>}
          {expense.nota && <span className="ticket__nota">{expense.nota}</span>}
          {expense.pending && <span className="ticket__pending">Sin sincronizar</span>}
        </div>
        <div className="ticket__right">
          <span className="ticket__monto"><Amount value={expense.monto} /></span>
          <span className="ticket__fecha">{fecha}</span>
        </div>
      </button>
      <div className="ticket__perforation" aria-hidden="true" />
      {expense.receipt_path && (
        <button className="ticket__receipt" onClick={verBoleta} disabled={abriendo}>
          {abriendo ? 'Abriendo…' : 'Ver boleta'}
        </button>
      )}
      <button
        className="ticket__delete"
        onClick={() => onDelete(expense.id)}
        aria-label={`Eliminar gasto de ${nombre}`}
      >
        Eliminar
      </button>
      <Modal open={!!boletaUrl} onClose={() => setBoletaUrl(null)} title="Boleta">
        {boletaUrl && <img src={boletaUrl} alt="Foto de la boleta" style={{ width: '100%', borderRadius: 8 }} />}
      </Modal>
    </div>
  );
}

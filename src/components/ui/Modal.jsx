import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

// Contador global de modales abiertos. Con modales anidados (ej: crear
// categoría desde dentro del formulario de gasto), si cada Modal restaurara
// el scroll al cerrarse, cerrar el modal interno reactivaría el scroll de
// fondo aunque el modal externo siga abierto. Este contador evita eso.
let openModalCount = 0;

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);

    openModalCount++;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Se dibuja con un portal directo a <body>, fuera del árbol de JSX donde
  // se llamó <Modal>. Esto es crítico: si un modal se abre desde un botón
  // que vive DENTRO de otro <form> (ej: "+ Nueva categoría" dentro del
  // formulario de gasto), sin portal el <form> de este modal quedaría
  // anidado dentro del <form> exterior. Los formularios anidados son
  // inválidos en HTML y el navegador puede reaccionar enviando el
  // formulario de forma nativa (recargando toda la página) en vez de
  // ejecutar el onSubmit de React. El portal evita el anidamiento.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

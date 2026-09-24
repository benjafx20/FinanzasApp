import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { askAssistant } from '../../utils/askAssistant';
import { usePrivacy } from '../../context/PrivacyContext';
import './AssistantModal.css';

const PREGUNTAS_SUGERIDAS = [
  '¿Cuánto llevo gastado este mes?',
  '¿En qué categoría gasto más?',
  '¿Cómo voy con mis metas de ahorro?',
  '¿Me alcanza para un gasto de $50.000?',
];

export function AssistantModal({ open, onClose, context }) {
  const { hidden } = usePrivacy();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const enviar = async (texto) => {
    const pregunta = texto.trim();
    if (!pregunta || loading) return;

    const nuevosMensajes = [...messages, { role: 'user', content: pregunta }];
    setMessages(nuevosMensajes);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const respuesta = await askAssistant({ context, messages: nuevosMensajes });
      setMessages((prev) => [...prev, { role: 'assistant', content: respuesta }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    enviar(input);
  };

  if (hidden) {
    return (
      <Modal open={open} onClose={onClose} title="✨ Asistente financiero">
        <div className="assistant__bloqueado">
          <EyeOff size={22} />
          <p>
            El asistente necesita ver tus montos reales para responder, y ahora mismo tienes
            el modo lectura activado. Desactívalo (el botón del ojo, arriba) y vuelve a intentar.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="✨ Asistente financiero">
      <div className="assistant">
        <div className="assistant__lista" ref={listRef}>
          {messages.length === 0 && (
            <div className="assistant__vacio">
              <Sparkles size={22} className="assistant__vacio-icon" />
              <p>Pregúntame lo que quieras sobre tus gastos, tus categorías, tus metas o tus deudas.</p>
              <div className="assistant__sugerencias">
                {PREGUNTAS_SUGERIDAS.map((p) => (
                  <button key={p} className="assistant__sugerencia" onClick={() => enviar(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`assistant__burbuja assistant__burbuja--${m.role}`}>
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="assistant__burbuja assistant__burbuja--assistant assistant__burbuja--loading">
              <Loader2 size={14} className="assistant__spin" /> Pensando…
            </div>
          )}
        </div>

        {error && <p className="assistant__error">{error}</p>}

        <form className="assistant__input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            className="assistant__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            autoFocus
          />
          <button type="submit" className="assistant__send" disabled={loading || !input.trim()} aria-label="Enviar">
            <Send size={16} />
          </button>
        </form>
      </div>
    </Modal>
  );
}

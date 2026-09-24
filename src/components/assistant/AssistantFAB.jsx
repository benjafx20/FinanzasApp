import { Sparkles } from 'lucide-react';
import './AssistantFAB.css';

export function AssistantFAB({ onClick }) {
  return (
    <button className="assistant-fab" onClick={onClick} aria-label="Abrir asistente financiero">
      <Sparkles size={22} />
    </button>
  );
}

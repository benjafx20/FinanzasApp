import { useState } from 'react';
import { Button } from '../ui/Button';
import './OnboardingModal.css';

const SLIDES = [
  {
    emoji: '💸',
    title: '¡Bienvenido a Mis Finanzas!',
    text: 'Registra tus gastos en segundos y mira en qué se te va la plata cada semana y cada mes.',
  },
  {
    emoji: '➕',
    title: 'Registra un gasto',
    text: 'Toca el botón violeta con el + para agregar un gasto: elige la categoría, el monto y listo.',
  },
  {
    emoji: '🎯',
    title: 'Presupuestos y metas',
    text: 'Desliza las tarjetas de arriba para definir cuánto quieres gastar por categoría, o crea una meta de ahorro y ve aportando de a poco.',
  },
  {
    emoji: '✏️',
    title: 'Edita cuando quieras',
    text: 'Toca cualquier gasto de la lista para editarlo, o usa "Eliminar" si te equivocaste.',
  },
];

export function OnboardingModal({ onFinish }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-sheet">
        <div className="onboarding-emoji" aria-hidden="true">{slide.emoji}</div>
        <h2 className="onboarding-title">{slide.title}</h2>
        <p className="onboarding-text">{slide.text}</p>

        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'onboarding-dot--active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {!isLast && (
            <button className="onboarding-skip" onClick={onFinish}>
              Saltar
            </button>
          )}
          <Button
            fullWidth={isLast}
            onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
          >
            {isLast ? 'Empezar' : 'Siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import './Input.css';

function formatThousands(rawDigits) {
  if (!rawDigits) return '';
  return new Intl.NumberFormat('es-CL').format(Number(rawDigits));
}

// value/onChange trabajan con el número crudo (ej: 15000), no con el texto formateado.
export function CurrencyInput({ label, id, value, onChange, error, placeholder, required, autoFocus }) {
  const [display, setDisplay] = useState(value ? formatThousands(value) : '');

  // Sincroniza si value cambia desde afuera (ej: al precargar un límite
  // existente). Se ajusta durante el render (comparando con el valor
  // anterior) en vez de con un useEffect, para no gastar un render extra.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDisplay(value ? formatThousands(value) : '');
  }

  const handleChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setDisplay(formatThousands(rawDigits));
    onChange(rawDigits === '' ? '' : Number(rawDigits));
  };

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="currency-input-wrap">
        <span className="currency-input-prefix">$</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className={`input currency-input ${error ? 'input--error' : ''}`}
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
        />
      </div>
      {error && <span className="input-error" role="alert">{error}</span>}
    </div>
  );
}

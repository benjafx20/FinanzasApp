import './Input.css';

export function Input({ label, error, id, ...props }) {
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input id={id} className={`input ${error ? 'input--error' : ''}`} {...props} />
      {error && <span className="input-error" role="alert">{error}</span>}
    </div>
  );
}

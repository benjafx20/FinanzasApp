import './Button.css';

export function Button({ children, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

import { forwardRef, useId, useState } from 'react';
import Icon from './Icon';
import styles from '../../styles/Input.module.css';

/**
 * Labelled input with inline error + hint. `as="textarea"` renders a textarea.
 * Password inputs get a show/hide toggle automatically.
 */
const Input = forwardRef(function Input(
  { label, error, hint, id, as = 'input', type = 'text', icon, required, className = '', hideLabel = false, suffix, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || `in-${autoId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const Tag = as;

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={hideLabel ? 'sr-only' : styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={`${styles.control} ${error ? styles.invalid : ''} ${icon ? styles.hasIcon : ''}`}>
        {icon && <Icon name={icon} size={18} className={styles.icon} />}
        <Tag
          ref={ref}
          id={inputId}
          type={as === 'input' ? (isPassword && showPassword ? 'text' : type) : undefined}
          className={`${styles.input} ${as === 'textarea' ? styles.textarea : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;

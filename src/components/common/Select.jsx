import { forwardRef, useId } from 'react';
import Icon from './Icon';
import styles from '../../styles/Select.module.css';

/**
 * options: [{ value, label, disabled? }] (or pass <option> children).
 * `placeholder` renders an empty first option.
 */
const Select = forwardRef(function Select(
  { label, error, hint, id, options, placeholder, required, hideLabel = false, className = '', children, ...rest },
  ref
) {
  const autoId = useId();
  const selectId = id || `sel-${autoId}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={hideLabel ? 'sr-only' : styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        <select
          ref={ref}
          id={selectId}
          className={styles.select}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
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

export default Select;

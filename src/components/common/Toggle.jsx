import { useId } from 'react';
import styles from '../../styles/Toggle.module.css';

/** Accessible switch (role="switch"). onChange receives the new boolean. */
export default function Toggle({ checked, onChange, label, description, disabled = false, hideLabel = false, id }) {
  const autoId = useId();
  const toggleId = id || `tg-${autoId}`;
  const descId = description ? `${toggleId}-desc` : undefined;

  return (
    <div className={styles.row}>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descId}
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : `${toggleId}-label`}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`${styles.track} ${checked ? styles.on : ''}`}
      >
        <span className={styles.thumb} />
      </button>
      {!hideLabel && (
        <span className={styles.text}>
          <span id={`${toggleId}-label`} className={styles.label} onClick={() => !disabled && onChange?.(!checked)}>
            {label}
          </span>
          {description && (
            <span id={descId} className={styles.description}>
              {description}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

import styles from '../../styles/Spinner.module.css';

/** size: sm | md | lg. `fullPage` centers it in the viewport. */
export default function Spinner({ size = 'md', label = 'Loading…', inline = false, fullPage = false, className = '' }) {
  const spinner = <span className={`${styles.spinner} ${styles[size]}`} aria-hidden="true" />;

  if (inline) {
    return (
      <span className={`${styles.inline} ${className}`} role={label ? 'status' : undefined}>
        {spinner}
        {label && <span className="sr-only">{label}</span>}
      </span>
    );
  }

  return (
    <div className={`${fullPage ? styles.fullPage : styles.block} ${className}`} role="status" aria-live="polite">
      {spinner}
      {label && <span className={styles.text}>{label}</span>}
    </div>
  );
}

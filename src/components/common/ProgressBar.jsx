import styles from '../../styles/ProgressBar.module.css';

/**
 * value/max progress bar. tone auto-switches to warning ≥ 80% and danger at 100%
 * when `capacity` is true (used for class capacity).
 */
export default function ProgressBar({ value = 0, max = 100, label, showValue = false, capacity = false, size = 'md', tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  let resolved = tone || 'primary';
  if (capacity && !tone) resolved = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'primary';

  return (
    <div className={styles.wrap}>
      {(label || showValue) && (
        <div className={styles.meta}>
          {label && <span>{label}</span>}
          {showValue && (
            <span className={styles.value}>{capacity ? `${value}/${max}` : `${Math.round(pct)}%`}</span>
          )}
        </div>
      )}
      <div
        className={`${styles.track} ${styles[size]}`}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || (capacity ? 'Capacity' : 'Progress')}
      >
        <span className={`${styles.fill} ${styles[resolved]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

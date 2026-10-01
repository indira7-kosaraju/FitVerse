import { STATUS_TONE } from '../../utils/constants';
import styles from '../../styles/Badge.module.css';

/**
 * tone: primary | accent | success | warning | danger | info | neutral
 * Pass `status` instead to auto-pick a tone and a readable label.
 */
export default function Badge({ tone, status, dot = false, size = 'md', className = '', children }) {
  const resolvedTone = tone || (status && STATUS_TONE[status]) || 'neutral';
  const label = children ?? (status ? String(status).replace(/_/g, ' ') : null);

  return (
    <span className={`${styles.badge} ${styles[resolvedTone]} ${styles[size]} ${className}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {label}
    </span>
  );
}

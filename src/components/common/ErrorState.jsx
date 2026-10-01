import Button from './Button';
import Icon from './Icon';
import styles from '../../styles/EmptyState.module.css';

/** Error message with a retry button — used whenever a fetch fails. */
export default function ErrorState({ message = 'Something went wrong.', onRetry, title = "Couldn't load this", compact = false }) {
  return (
    <div className={`${styles.empty} ${styles.error} ${compact ? styles.compact : ''}`} role="alert">
      <span className={styles.iconWrap}>
        <Icon name="alert" size={compact ? 22 : 28} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

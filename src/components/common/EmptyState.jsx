import Icon from './Icon';
import styles from '../../styles/EmptyState.module.css';

export default function EmptyState({ icon = 'inbox', title = 'Nothing here yet', message, action, compact = false }) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
      <span className={styles.iconWrap}>
        <Icon name={icon} size={compact ? 22 : 28} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      {message && <p className={styles.message}>{message}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

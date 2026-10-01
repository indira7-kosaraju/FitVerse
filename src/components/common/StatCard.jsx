import Icon from './Icon';
import Skeleton from './Skeleton';
import styles from '../../styles/StatCard.module.css';

/**
 * KPI tile. delta: number (percentage points) → green up / red down arrow.
 * tone: primary | accent | info | success
 */
export default function StatCard({ label, value, icon, delta, deltaLabel, tone = 'primary', loading = false, hint }) {
  const up = typeof delta === 'number' && delta >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <span className={`${styles.icon} ${styles[tone]}`}>
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton height={32} width="60%" />
      ) : (
        <p className={styles.value}>{value ?? '—'}</p>
      )}
      {!loading && (typeof delta === 'number' || hint) && (
        <p className={styles.footer}>
          {typeof delta === 'number' && (
            <span className={up ? styles.up : styles.down}>
              <Icon name={up ? 'trendingUp' : 'trendingDown'} size={14} />
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          <span>{deltaLabel || hint}</span>
        </p>
      )}
    </div>
  );
}

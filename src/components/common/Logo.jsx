import { Link } from 'react-router-dom';
import styles from '../../styles/Logo.module.css';

export default function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link to={to} className={`${styles.logo} ${className}`} aria-label="FitVerse home">
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 32 32" width="32" height="32">
          <rect width="32" height="32" rx="9" fill="currentColor" />
          <path d="M9 23V9h12v3.5h-8v2.5h6.5v3.5H13V23z" fill="var(--primary-contrast)" />
          <circle cx="23" cy="21" r="2.5" fill="var(--accent)" />
        </svg>
      </span>
      {!compact && (
        <span className={styles.word}>
          Fit<span>Verse</span>
        </span>
      )}
    </Link>
  );
}

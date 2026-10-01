import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import styles from '../../styles/PageHeader.module.css';

/**
 * Page title row. Also sets document.title.
 * back: { to, label } renders a back link above the title.
 */
export default function PageHeader({ title, subtitle, actions, back, eyebrow }) {
  useEffect(() => {
    if (typeof title === 'string') document.title = `${title} · FitVerse`;
  }, [title]);

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {back && (
          <Link to={back.to} className={styles.back}>
            <Icon name="chevronLeft" size={16} />
            {back.label || 'Back'}
          </Link>
        )}
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

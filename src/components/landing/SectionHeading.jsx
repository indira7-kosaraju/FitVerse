import styles from '../../styles/LandingSections.module.css';

export default function SectionHeading({ id, eyebrow, title, subtitle, action }) {
  return (
    <header className={styles.heading}>
      <div className={styles.headingText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.headingAction}>{action}</div>}
    </header>
  );
}

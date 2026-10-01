import styles from '../../styles/Card.module.css';

/**
 * Generic surface. Optional header with `title`, `subtitle`, `actions`.
 * variant: default | highlight | flat ; `interactive` adds hover lift.
 */
export default function Card({
  as: Tag = 'section',
  title,
  subtitle,
  actions,
  footer,
  variant = 'default',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  titleAs: TitleTag = 'h2',
  ...rest
}) {
  const cls = [styles.card, styles[variant], styles[`pad-${padding}`], interactive && styles.interactive, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={cls} {...rest}>
      {(title || actions) && (
        <header className={styles.header}>
          <div className={styles.headings}>
            {title && <TitleTag className={styles.title}>{title}</TitleTag>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </Tag>
  );
}

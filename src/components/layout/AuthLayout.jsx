import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import Icon from '../common/Icon';
import { ThemeToggle } from './Navbar';
import styles from '../../styles/AuthLayout.module.css';

const BRAND_STATS = [
  { value: '2.4k+', label: 'Active members' },
  { value: '60+', label: 'Classes / week' },
  { value: '18', label: 'Expert coaches' },
];

/**
 * Split-screen shell for public auth pages.
 * Left: brand panel (hidden on small screens, condensed banner instead). Right: form card.
 */
export default function AuthLayout({ title, subtitle, eyebrow, docTitle, children, footer }) {
  useEffect(() => {
    const t = docTitle || (typeof title === 'string' ? title : null);
    if (t) document.title = `${t} · FitVerse`;
  }, [docTitle, title]);

  return (
    <div className={styles.shell}>
      <aside className={styles.brand} aria-label="About FitVerse">
        <div className={styles.art} aria-hidden="true">
          <span className={styles.blobLime} />
          <span className={styles.blobOrange} />
          <span className={styles.ring} />
          <span className={styles.stripes} />
          <span className={styles.bars}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className={styles.brandTop}>
          <Logo />
        </div>

        <div className={styles.brandBody}>
          <p className={styles.kicker}>
            <Icon name="bolt" size={16} /> Built for people who show up
          </p>
          <h2 className={styles.headline}>
            Every rep <span className={styles.hl}>counts.</span>
            <br />
            Every day <span className={styles.hlAccent}>matters.</span>
          </h2>
          <p className={styles.lede}>
            Book classes, follow coach-built plans and watch your progress climb — all in one place.
          </p>
        </div>

        <ul className={styles.stats}>
          {BRAND_STATS.map((s) => (
            <li key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main} id="main">
        <div className={styles.topBar}>
          <span className={styles.mobileLogo}>
            <Logo />
          </span>
          <Link to="/" className={styles.homeLink}>
            <Icon name="chevronLeft" size={16} /> Back to site
          </Link>
          <ThemeToggle />
        </div>

        <div className={styles.center}>
          <section className={styles.card} aria-labelledby="auth-title">
            <header className={styles.header}>
              {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
              <h1 id="auth-title" className={styles.title}>
                {title}
              </h1>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </header>
            {children}
          </section>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </main>
    </div>
  );
}

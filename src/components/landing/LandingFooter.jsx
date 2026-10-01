import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import Icon from '../common/Icon';
import { NAV_LINKS } from './LandingNav';
import styles from '../../styles/LandingFooter.module.css';

const HOURS = [
  { days: 'Mon – Fri', time: '5:00 AM – 11:00 PM' },
  { days: 'Saturday', time: '6:00 AM – 9:00 PM' },
  { days: 'Sunday', time: '7:00 AM – 8:00 PM' },
];

const SOCIALS = ['Instagram', 'TikTok', 'YouTube', 'Strava'];

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Logo />
          <p className={styles.tagline}>
            The gym that travels with you. Classes, coaching and progress tracking — all in one place.
          </p>
          <p className={styles.contact}>
            <Icon name="mapPin" size={16} /> 221 Iron Street, Downtown
          </p>
          <p className={styles.contact}>
            <Icon name="mail" size={16} /> <a href="mailto:hello@fitverse.app">hello@fitverse.app</a>
          </p>
        </div>

        <nav className={styles.col} aria-label="Explore">
          <h2 className={styles.colTitle}>Explore</h2>
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.col} aria-label="Account">
          <h2 className={styles.colTitle}>Account</h2>
          <ul>
            <li>
              <Link to="/register">Join now</Link>
            </li>
            <li>
              <Link to="/login">Log in</Link>
            </li>
            <li>
              <Link to="/forgot-password">Reset password</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Opening hours</h2>
          <dl className={styles.hours}>
            {HOURS.map((h) => (
              <div key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Follow us</h2>
          <ul className={styles.socials}>
            {SOCIALS.map((s) => (
              <li key={s}>
                <span>@fitverse · {s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {year} FitVerse. All rights reserved.</p>
        <p className={styles.legal}>
          <span id="terms">Terms of Service</span>
          <span aria-hidden="true">·</span>
          <span id="privacy">Privacy Policy</span>
        </p>
      </div>
    </footer>
  );
}

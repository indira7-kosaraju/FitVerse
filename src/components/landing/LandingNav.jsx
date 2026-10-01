import { useEffect, useState } from 'react';
import Logo from '../common/Logo';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { ThemeToggle } from '../layout/Navbar';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/LandingNav.module.css';

export const NAV_LINKS = [
  { href: '#plans', label: 'Plans' },
  { href: '#trainers', label: 'Trainers' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#stories', label: 'Stories' },
];

export default function LandingNav() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Logo />

        <nav className={styles.links} aria-label="Primary">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Button to={ROLE_HOME[user?.role] || '/home'} size="sm" iconRight="arrowRight" className={styles.cta}>
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className={styles.login}>
                Log in
              </Button>
              <Button to="/register" size="sm" className={styles.cta}>
                Join now
              </Button>
            </>
          )}
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="landing-mobile-menu" className={styles.mobileMenu} aria-label="Mobile">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={close}>
                  {l.label}
                  <Icon name="chevronRight" size={18} />
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              <Button to={ROLE_HOME[user?.role] || '/home'} fullWidth iconRight="arrowRight" onClick={close}>
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button to="/login" variant="secondary" fullWidth onClick={close}>
                  Log in
                </Button>
                <Button to="/register" fullWidth onClick={close}>
                  Join now
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

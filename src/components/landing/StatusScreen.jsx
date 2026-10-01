import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';
import Button from '../common/Button';
import { ThemeToggle } from '../layout/Navbar';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/StatusScreen.module.css';

/** Full-page branded status (404 / 403). `code` is a 3-char string; the middle char becomes the "plate". */
export default function StatusScreen({ code, title, message, docTitle, tone = 'primary' }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const home = isAuthenticated ? ROLE_HOME[user?.role] || '/' : '/';
  const digits = String(code).split('');

  useEffect(() => {
    document.title = `${docTitle || title} · FitVerse`;
  }, [docTitle, title]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(home);
  };

  return (
    <div className={`${styles.page} ${styles[tone] || ''}`}>
      <header className={styles.top}>
        <Logo to={home} />
        <ThemeToggle />
      </header>

      <main className={styles.main} id="main">
        <div className={styles.art} aria-hidden="true">
          <span className={styles.glow} />
          <span className={styles.orbit} />
        </div>

        <p className={styles.code} aria-label={`Error ${code}`}>
          {digits.map((d, i) => (
            <span key={i} className={i === 1 ? styles.plate : styles.digit} aria-hidden="true">
              {d}
            </span>
          ))}
        </p>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <Button to={home} size="lg" icon="home">
            {isAuthenticated ? 'Go to dashboard' : 'Go home'}
          </Button>
          <Button variant="secondary" size="lg" icon="chevronLeft" onClick={goBack}>
            Go back
          </Button>
        </div>
      </main>
    </div>
  );
}

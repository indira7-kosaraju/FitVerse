import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import Spinner from '../common/Spinner';
import styles from '../../styles/AppLayout.module.css';

export default function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  // Move focus to main content on route change for screen-reader users.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className={styles.column}>
        <Navbar />
        <main id="main-content" ref={mainRef} tabIndex={-1} className={styles.main}>
          <Suspense fallback={<Spinner size="lg" label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

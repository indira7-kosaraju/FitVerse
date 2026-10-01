import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import Icon from '../common/Icon';
import Avatar from '../common/Avatar';
import useAuth from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_HOME } from '../../utils/constants';
import { ROLE_LABEL } from './navItems';
import styles from '../../styles/Navbar.module.css';

export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={20} />
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const base = ROLE_HOME[user?.role] || '/app';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <header className={styles.navbar}>
      <div className={styles.mobileLogo}>
        <Logo to={base} />
      </div>
      <p className={styles.greeting}>
        {greeting}, <strong>{user?.name?.split(' ')[0]}</strong>
      </p>

      <div className={styles.actions}>
        <ThemeToggle />
        <div className={styles.userMenu}>
          <button
            ref={buttonRef}
            type="button"
            className={styles.userBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
          >
            <Avatar src={user?.avatarUrl} name={user?.name} size={36} />
            <span className={styles.userText}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{ROLE_LABEL[user?.role]}</span>
            </span>
            <Icon name="chevronDown" size={16} className={styles.chevron} />
          </button>
          {menuOpen && (
            <div id="user-menu" ref={menuRef} className={styles.menu} role="menu">
              <div className={styles.menuHeader}>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <Link to={`${base}/profile`} role="menuitem" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                <Icon name="user" size={18} /> Profile
              </Link>
              {user?.role === 'member' && (
                <Link to="/app/membership" role="menuitem" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  <Icon name="card" size={18} /> Membership
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                <Icon name="logout" size={18} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

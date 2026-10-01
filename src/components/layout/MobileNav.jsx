import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import Modal from '../common/Modal';
import useAuth from '../../hooks/useAuth';
import { NAV_ITEMS } from './navItems';
import styles from '../../styles/MobileNav.module.css';

export default function MobileNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV_ITEMS[user?.role] || [];
  const primary = items.filter((i) => i.mobile).slice(0, 4);
  const rest = items.filter((i) => !primary.includes(i));
  const moreActive = rest.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  return (
    <>
      <nav className={styles.mobileNav} aria-label="Primary">
        <ul>
          {primary.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          {rest.length > 0 && (
            <li>
              <button
                type="button"
                className={`${styles.item} ${moreActive ? styles.active : ''}`}
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <Icon name="more" size={22} />
                <span>More</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <ul className={styles.sheet}>
          {rest.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => `${styles.sheetItem} ${isActive ? styles.sheetActive : ''}`}>
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button type="button" className={styles.sheetItem} onClick={logout}>
              <Icon name="logout" size={22} />
              <span>Log out</span>
            </button>
          </li>
        </ul>
      </Modal>
    </>
  );
}

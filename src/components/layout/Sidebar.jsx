import { NavLink } from 'react-router-dom';
import Logo from '../common/Logo';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import { NAV_ITEMS, ROLE_LABEL } from './navItems';
import styles from '../../styles/Sidebar.module.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>
        <Logo to={ROLE_HOME[user?.role] || '/'} />
        <span className={styles.role}>{ROLE_LABEL[user?.role]}</span>
      </div>

      <nav className={styles.nav}>
        <ul>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        {user?.role === 'member' && (
          <div className={styles.promo}>
            <Icon name="bolt" size={18} />
            <p>
              <strong>Stay consistent.</strong> Book your next class before you leave the gym.
            </p>
          </div>
        )}
        <button type="button" className={styles.link} onClick={logout}>
          <Icon name="logout" size={20} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

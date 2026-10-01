import { useState } from 'react';
import styles from '../../styles/Avatar.module.css';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

/** size in px. Falls back to initials on missing/broken image. */
export default function Avatar({ src, name = '', size = 40, className = '', ring = false }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };

  return (
    <span className={`${styles.avatar} ${ring ? styles.ring : ''} ${className}`} style={style}>
      {src && !broken ? (
        <img src={src} alt={name ? `${name}'s avatar` : ''} onError={() => setBroken(true)} loading="lazy" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {(!src || broken) && name && <span className="sr-only">{name}</span>}
    </span>
  );
}

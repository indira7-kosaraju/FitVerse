import { useEffect, useRef, useState } from 'react';
import heroImage from '../../assets/hero-fitness-woman.webp';
import styles from '../../styles/LandingHero.module.css';

/**
 * Hero photo, feathered into the page background, with a very light pointer parallax on desktop.
 * Parallax is skipped for touch devices and reduced-motion users.
 */
export default function HeroPhoto() {
  const wrapRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!node || !fine || reduce) return undefined;

    let frame = 0;
    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        node.style.setProperty('--px', `${(x * -8).toFixed(2)}px`);
        node.style.setProperty('--py', `${(y * -6).toFixed(2)}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.photo} data-loaded={loaded}>
      {!failed && (
        <img
          className={styles.photoImg}
          src={heroImage}
          alt=""
          width="1366"
          height="1024"
          decoding="async"
          fetchpriority="high"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

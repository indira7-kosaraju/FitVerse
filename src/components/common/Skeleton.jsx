import styles from '../../styles/Skeleton.module.css';

/** Shimmering placeholder. `count` renders several stacked lines. */
export default function Skeleton({ width = '100%', height = 16, radius = 8, count = 1, gap = 10, circle = false, className = '' }) {
  const items = Array.from({ length: count });
  return (
    <div className={`${styles.wrap} ${className}`} style={{ gap }} aria-hidden="true">
      {items.map((_, i) => (
        <span
          key={i}
          className={styles.skeleton}
          style={{
            width: circle ? height : i === count - 1 && count > 1 ? '70%' : width,
            height,
            borderRadius: circle ? '50%' : radius,
          }}
        />
      ))}
    </div>
  );
}

/** A card-shaped skeleton for grids. */
export function SkeletonCard({ lines = 3, height }) {
  return (
    <div className={styles.card} style={height ? { minHeight: height } : undefined} aria-hidden="true">
      <Skeleton height={20} width="45%" />
      <Skeleton count={lines} height={12} />
    </div>
  );
}

/** Renders `count` SkeletonCards inside a responsive grid with an sr-only status. */
export function SkeletonGrid({ count = 6, lines = 3, minWidth = 260, label = 'Loading…' }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className={styles.grid} style={{ '--min': `${minWidth}px` }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} lines={lines} />
        ))}
      </div>
    </div>
  );
}

import Icon from './Icon';
import styles from '../../styles/Pagination.module.css';

function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const list = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) list.push('…start');
  for (let i = start; i <= end; i += 1) list.push(i);
  if (end < pages - 1) list.push('…end');
  list.push(pages);
  return list;
}

export default function Pagination({ page = 1, pages = 1, total, limit, onPageChange, disabled = false }) {
  if (pages <= 1) return total !== undefined ? <p className={styles.summary}>{total} result{total === 1 ? '' : 's'}</p> : null;

  const from = limit ? (page - 1) * limit + 1 : null;
  const to = limit && total !== undefined ? Math.min(page * limit, total) : null;

  return (
    <nav className={styles.wrap} aria-label="Pagination">
      {total !== undefined && from && (
        <p className={styles.summary}>
          Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
        </p>
      )}
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={styles.btn}
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
        </li>
        {pageList(page, pages).map((p) =>
          typeof p === 'string' ? (
            <li key={p} className={styles.ellipsis} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p} className={p === page || Math.abs(p - page) <= 1 || p === 1 || p === pages ? '' : styles.hideMobile}>
              <button
                type="button"
                className={`${styles.btn} ${p === page ? styles.active : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                disabled={disabled}
              >
                {p}
              </button>
            </li>
          )
        )}
        <li>
          <button
            type="button"
            className={styles.btn}
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= pages}
            aria-label="Next page"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

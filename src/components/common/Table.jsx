import { useEffect, useRef } from 'react';
import Icon from './Icon';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import styles from '../../styles/Table.module.css';

/**
 * columns: [{ key, header, render?(row), sortable?, align?: 'left'|'right'|'center', width?, hideOnMobile? }]
 * sort: { key, dir: 'asc'|'desc' }, onSort(key)
 * selectable + selectedIds (array) + onSelectionChange(ids)
 * onRowClick(row) makes rows keyboard-activatable.
 */
export default function Table({
  columns,
  data = [],
  rowKey = '_id',
  sort,
  onSort,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  loading = false,
  skeletonRows = 6,
  emptyTitle = 'No results',
  emptyMessage,
  caption,
  className = '',
}) {
  const headerCheckbox = useRef(null);
  const ids = data.map((r) => r[rowKey]);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const someSelected = ids.some((id) => selectedIds.includes(id)) && !allSelected;

  useEffect(() => {
    if (headerCheckbox.current) headerCheckbox.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.(selectedIds.filter((id) => !ids.includes(id)));
    else onSelectionChange?.(Array.from(new Set([...selectedIds, ...ids])));
  };

  const toggleOne = (id) => {
    onSelectionChange?.(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const ariaSort = (col) => {
    if (!col.sortable || sort?.key !== col.key) return undefined;
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  if (!loading && data.length === 0) {
    return <EmptyState icon="inbox" title={emptyTitle} message={emptyMessage} compact />;
  }

  return (
    <div className={`${styles.wrap} ${className}`}>
      <table className={styles.table} aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className={styles.checkCell}>
                <input
                  ref={headerCheckbox}
                  type="checkbox"
                  className={styles.checkbox}
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows on this page"
                  disabled={loading}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={ariaSort(col)}
                style={{ width: col.width, textAlign: col.align }}
                className={col.hideOnMobile ? styles.hideMobile : undefined}
              >
                {col.sortable && onSort ? (
                  <button type="button" className={styles.sortBtn} onClick={() => onSort(col.key)}>
                    {col.header}
                    <Icon
                      name={sort?.key === col.key ? (sort.dir === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'}
                      size={14}
                      className={sort?.key === col.key ? styles.sortActive : styles.sortIdle}
                    />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {selectable && <td className={styles.checkCell} />}
                  {columns.map((col) => (
                    <td key={col.key} className={col.hideOnMobile ? styles.hideMobile : undefined}>
                      <Skeleton height={14} width={i % 2 ? '70%' : '90%'} />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row) => {
                const id = row[rowKey];
                const selected = selectedIds.includes(id);
                return (
                  <tr
                    key={id}
                    className={`${onRowClick ? styles.clickable : ''} ${selected ? styles.selected : ''}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {selectable && (
                      <td className={styles.checkCell} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selected}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select row ${row.name || row.title || id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{ textAlign: col.align }}
                        className={col.hideOnMobile ? styles.hideMobile : undefined}
                      >
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

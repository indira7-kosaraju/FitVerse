import { useId, useRef } from 'react';
import styles from '../../styles/Tabs.module.css';

/**
 * WAI-ARIA tabs (arrow-key navigation). Controlled:
 *   <Tabs tabs={[{ id:'upcoming', label:'Upcoming', count:3 }]} value={tab} onChange={setTab} />
 * Render the panel yourself with <TabPanel id="upcoming" value={tab} tabsId={...}> or just conditionally.
 */
export default function Tabs({ tabs, value, onChange, label = 'Tabs', idPrefix }) {
  const autoId = useId();
  const prefix = idPrefix || autoId;
  const refs = useRef([]);

  const onKeyDown = (e, idx) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(tabs[next].id);
    }
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {tabs.map((t, idx) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[idx] = el)}
            id={`${prefix}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.active : ''}`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            {t.label}
            {typeof t.count === 'number' && <span className={styles.count}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, id, value, children }) {
  if (id !== value) return null;
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}

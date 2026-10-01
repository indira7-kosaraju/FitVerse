import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import styles from '../../styles/Modal.module.css';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

/**
 * Accessible dialog: portal, focus trap, Esc to close, restores focus, locks scroll.
 * variant: 'center' (default) | 'drawer' (slides from the right; full-screen sheet on mobile)
 * size: sm | md | lg | xl
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'center',
  closeOnBackdrop = true,
  initialFocusRef,
  labelledBy,
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    openCount += 1;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const node = dialogRef.current;
      if (!node) return;
      const target =
        initialFocusRef?.current ||
        node.querySelector('[data-autofocus]') ||
        node.querySelector(`.${styles.body}`)?.querySelector(FOCUSABLE) ||
        node.querySelector(FOCUSABLE) ||
        node;
      target.focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const node = dialogRef.current;
    node?.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(raf);
      node?.removeEventListener('keydown', handleKey);
      openCount -= 1;
      if (openCount <= 0) {
        openCount = 0;
        document.body.style.overflow = '';
      }
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className={`${styles.backdrop} ${variant === 'drawer' ? styles.backdropDrawer : ''}`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[variant]} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        {(title || onClose) && (
          <header className={styles.header}>
            <div>
              {title && (
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close dialog">
                <Icon name="close" size={20} />
              </button>
            )}
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

import { useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import styles from '../../styles/ConfirmDialog.module.css';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  const cancelRef = useRef(null);

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      size="sm"
      initialFocusRef={cancelRef}
      closeOnBackdrop={!loading}
      labelledBy="confirm-dialog-title"
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <span className={`${styles.icon} ${danger ? styles.danger : ''}`}>
          <Icon name={danger ? 'alert' : 'info'} size={22} />
        </span>
        <div>
          <h2 id="confirm-dialog-title" className={styles.title}>
            {title}
          </h2>
          {message && <p className={styles.message}>{message}</p>}
          {children}
        </div>
      </div>
    </Modal>
  );
}

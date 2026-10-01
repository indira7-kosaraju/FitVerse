import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import Skeleton from '../common/Skeleton';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import useFetch from '../../hooks/useFetch';
import { getRoster } from '../../api/classApi';
import { markAttendance } from '../../api/bookingApi';
import { getErrorMessage, toList } from '../../api/axios';
import { formatDateTime, isPast } from '../../utils/formatDate';
import styles from '../../styles/RosterModal.module.css';

function RosterBody({ gymClass }) {
  const { data, loading, error, refetch, setData } = useFetch(() => getRoster(gymClass._id), [gymClass._id], {
    initialData: [],
  });
  const [pending, setPending] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const bookings = toList(data);
  const active = bookings.filter((b) => b.status !== 'cancelled');
  const cancelledCount = bookings.length - active.length;
  const attendedCount = active.filter((b) => b.status === 'attended').length;
  const noShowCount = active.filter((b) => b.status === 'no_show').length;
  const unmarked = active.filter((b) => b.status === 'booked');
  const capacity = Number(gymClass.capacity) || 0;
  const started = isPast(gymClass.startTime);

  const setStatuses = (updates) =>
    setData((prev) => {
      const list = toList(prev);
      const next = list.map((b) => (b._id in updates ? { ...b, status: updates[b._id] } : b));
      return Array.isArray(prev) ? next : { ...(prev || {}), data: next };
    });

  const mark = async (booking, status) => {
    const prevStatus = booking.status;
    if (prevStatus === status) return;
    setPending((p) => ({ ...p, [booking._id]: status }));
    setStatuses({ [booking._id]: status });
    try {
      await markAttendance(booking._id, status);
      toast.success(`${booking.user?.name || 'Member'} marked ${status === 'attended' ? 'present' : 'no-show'}`);
    } catch (err) {
      setStatuses({ [booking._id]: prevStatus });
      toast.error(getErrorMessage(err));
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[booking._id];
        return next;
      });
    }
  };

  const markAll = async () => {
    if (unmarked.length === 0) return;
    const targets = unmarked;
    setBulkLoading(true);
    setStatuses(Object.fromEntries(targets.map((b) => [b._id, 'attended'])));
    const results = await Promise.allSettled(targets.map((b) => markAttendance(b._id, 'attended')));
    const failed = targets.filter((_, i) => results[i].status === 'rejected');
    if (failed.length) {
      setStatuses(Object.fromEntries(failed.map((b) => [b._id, 'booked'])));
      const firstErr = results.find((r) => r.status === 'rejected')?.reason;
      toast.error(
        failed.length === targets.length
          ? getErrorMessage(firstErr)
          : `Marked ${targets.length - failed.length} present; ${failed.length} failed: ${getErrorMessage(firstErr)}`
      );
    } else {
      toast.success(`Marked ${targets.length} member${targets.length === 1 ? '' : 's'} present`);
    }
    setBulkLoading(false);
  };

  if (loading && bookings.length === 0) {
    return (
      <div role="status" aria-live="polite" className={styles.list}>
        <span className="sr-only">Loading roster…</span>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonRow}>
            <Skeleton circle height={40} />
            <Skeleton height={14} width="50%" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} compact />;

  return (
    <div className={styles.wrap}>
      <section className={styles.summary} aria-label="Capacity summary">
        <ProgressBar
          value={active.length}
          max={capacity || Math.max(active.length, 1)}
          capacity
          label={`${active.length} booked${capacity ? ` of ${capacity} spots` : ''}`}
          showValue={Boolean(capacity)}
        />
        <ul className={styles.counts}>
          <li>
            <strong>{attendedCount}</strong> present
          </li>
          <li>
            <strong>{noShowCount}</strong> no-show
          </li>
          <li>
            <strong>{unmarked.length}</strong> unmarked
          </li>
          {cancelledCount > 0 && (
            <li>
              <strong>{cancelledCount}</strong> cancelled
            </li>
          )}
        </ul>
      </section>

      {!started && active.length > 0 && (
        <p className={styles.note}>This class hasn&apos;t started yet — you can still pre-mark attendance.</p>
      )}

      {active.length === 0 ? (
        <EmptyState icon="users" title="No bookings yet" message="Members who book this class will show up here." compact />
      ) : (
        <>
          <div className={styles.bulk}>
            <Button
              size="sm"
              variant="outline"
              icon="checkCircle"
              onClick={markAll}
              loading={bulkLoading}
              disabled={unmarked.length === 0}
            >
              Mark all present
            </Button>
          </div>
          <ul className={styles.list}>
            {active.map((b) => {
              const busy = Boolean(pending[b._id]) || bulkLoading;
              const name = b.user?.name || 'Member';
              return (
                <li key={b._id} className={styles.row}>
                  <div className={styles.person}>
                    <Avatar src={b.user?.avatarUrl} name={name} size={40} />
                    <div className={styles.personText}>
                      <span className={styles.name}>{name}</span>
                      {b.user?.email && <span className={styles.email}>{b.user.email}</span>}
                    </div>
                  </div>
                  <Badge status={b.status} size="sm" />
                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      variant={b.status === 'attended' ? 'primary' : 'secondary'}
                      icon="check"
                      onClick={() => mark(b, 'attended')}
                      disabled={busy}
                      aria-pressed={b.status === 'attended'}
                      aria-label={`Mark ${name} attended`}
                    >
                      Attended
                    </Button>
                    <Button
                      size="sm"
                      variant={b.status === 'no_show' ? 'danger' : 'ghost'}
                      icon="close"
                      onClick={() => mark(b, 'no_show')}
                      disabled={busy}
                      aria-pressed={b.status === 'no_show'}
                      aria-label={`Mark ${name} as no-show`}
                    >
                      No-show
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default function RosterModal({ gymClass, open, onClose }) {
  return (
    <Modal
      open={open && Boolean(gymClass)}
      onClose={onClose}
      size="lg"
      title={gymClass ? `Roster · ${gymClass.title}` : 'Roster'}
      description={gymClass ? `${formatDateTime(gymClass.startTime)}${gymClass.location ? ` · ${gymClass.location}` : ''}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      {gymClass && <RosterBody gymClass={gymClass} />}
    </Modal>
  );
}

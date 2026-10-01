import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ClassCard from '../../components/common/ClassCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Icon from '../../components/common/Icon';
import Skeleton, { SkeletonGrid } from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import { getTrainer } from '../../api/trainerApi';
import { getClasses } from '../../api/classApi';
import { cancelBooking, createBooking, getMyBookings } from '../../api/bookingApi';
import { getErrorMessage, toList } from '../../api/axios';
import { addDays, formatDateTime } from '../../utils/formatDate';
import styles from '../../styles/TrainerDetail.module.css';

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

export default function TrainerDetail() {
  const { id } = useParams();

  const trainerQuery = useFetch(
    () =>
      getTrainer(id).catch((err) => {
        const status = err.response?.status;
        if (status === 404 || status === 400) return null;
        throw err;
      }),
    [id]
  );

  // Window is computed once per trainer so refetches stay stable.
  const window14 = useMemo(() => {
    const now = new Date();
    return { from: now.toISOString(), to: addDays(now, 14).toISOString() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const classesQuery = useFetch(
    () => getClasses({ trainer: id, from: window14.from, to: window14.to, limit: 50 }),
    [id, window14]
  );

  const bookingsQuery = useFetch(() => getMyBookings({ status: 'booked', limit: 200 }), []);

  /** classId → bookingId for the member's active bookings */
  const bookingMap = useMemo(() => {
    const map = {};
    toList(bookingsQuery.data).forEach((b) => {
      const classId = idOf(b.gymClass);
      if (classId && (!b.status || b.status === 'booked')) map[classId] = b._id;
    });
    return map;
  }, [bookingsQuery.data]);

  const classes = useMemo(
    () =>
      toList(classesQuery.data)
        .map((c) => ({ ...c, isBookedByMe: Boolean(c.isBookedByMe || bookingMap[c._id]) }))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [classesQuery.data, bookingMap]
  );

  const [confirm, setConfirm] = useState(null); // { mode: 'book'|'cancel', gymClass }
  const [pendingId, setPendingId] = useState(null);

  const patchClass = (classId, patch) =>
    classesQuery.setData((prev) => {
      if (!prev) return prev;
      const list = toList(prev).map((c) => (c._id === classId ? { ...c, ...patch(c) } : c));
      return Array.isArray(prev) ? list : { ...prev, data: list };
    });

  const setBooking = (classId, booking) =>
    bookingsQuery.setData((prev) => {
      const list = toList(prev).filter((b) => idOf(b.gymClass) !== classId);
      const next = booking ? [...list, booking] : list;
      return Array.isArray(prev) || !prev ? { data: next, total: next.length, page: 1, pages: 1 } : { ...prev, data: next };
    });

  const handleBook = async (gymClass) => {
    const classId = gymClass._id;
    setPendingId(classId);
    setConfirm(null);
    patchClass(classId, (c) => ({ isBookedByMe: true, bookedCount: (c.bookedCount || 0) + 1 }));
    try {
      const booking = await createBooking(classId);
      setBooking(classId, { _id: booking?._id, gymClass: classId, status: 'booked' });
      toast.success(`Booked: ${gymClass.title}`);
    } catch (err) {
      patchClass(classId, (c) => ({ isBookedByMe: false, bookedCount: Math.max(0, (c.bookedCount || 1) - 1) }));
      toast.error(getErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  const handleCancel = async (gymClass) => {
    const classId = gymClass._id;
    setPendingId(classId);
    setConfirm(null);
    let bookingId = bookingMap[classId];
    if (!bookingId) {
      const fresh = await bookingsQuery.refetch();
      bookingId = toList(fresh).find((b) => idOf(b.gymClass) === classId && (!b.status || b.status === 'booked'))?._id;
    }
    if (!bookingId) {
      toast.error('Could not find your booking for this class. Please try again from My bookings.');
      setPendingId(null);
      return;
    }
    patchClass(classId, (c) => ({ isBookedByMe: false, bookedCount: Math.max(0, (c.bookedCount || 1) - 1) }));
    setBooking(classId, null);
    try {
      await cancelBooking(bookingId);
      toast.success('Booking cancelled');
    } catch (err) {
      patchClass(classId, (c) => ({ isBookedByMe: true, bookedCount: (c.bookedCount || 0) + 1 }));
      setBooking(classId, { _id: bookingId, gymClass: classId, status: 'booked' });
      toast.error(getErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  const trainer = trainerQuery.data;
  const back = { to: '/app/trainers', label: 'All trainers' };

  if (trainerQuery.loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="Trainer" back={back} />
        <div className={styles.heroSkeleton} role="status" aria-live="polite">
          <span className="sr-only">Loading trainer…</span>
          <Skeleton circle height={112} />
          <div className={styles.heroSkeletonText}>
            <Skeleton height={28} width="50%" />
            <Skeleton height={14} count={3} />
          </div>
        </div>
        <SkeletonGrid count={3} />
      </div>
    );
  }

  if (trainerQuery.error) {
    return (
      <div className={styles.page}>
        <PageHeader title="Trainer" back={back} />
        <ErrorState message={trainerQuery.error} onRetry={trainerQuery.refetch} />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className={styles.page}>
        <PageHeader title="Trainer not found" back={back} />
        <EmptyState
          icon="user"
          title="We couldn’t find this trainer"
          message="They may have left the team or the link is incorrect."
          action={
            <Button to="/app/trainers" icon="users">
              Browse trainers
            </Button>
          }
        />
      </div>
    );
  }

  const specs = Array.isArray(trainer.specializations) ? trainer.specializations : [];

  return (
    <div className={styles.page}>
      <PageHeader title={trainer.name || 'Trainer'} eyebrow="Trainer profile" back={back} />

      <section className={styles.hero} aria-label="Trainer details">
        <Avatar src={trainer.avatarUrl} name={trainer.name} size={128} ring className={styles.heroAvatar} />
        <div className={styles.heroBody}>
          <h2 className={styles.heroName}>{trainer.name}</h2>
          {specs.length > 0 && (
            <ul className={styles.specs} aria-label="Specializations">
              {specs.map((s) => (
                <li key={s}>
                  <Badge tone="primary">{s}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.bio}>{trainer.bio || 'This trainer hasn’t added a bio yet.'}</p>
          {trainer.email && (
            <a className={styles.contact} href={`mailto:${trainer.email}`}>
              <Icon name="mail" size={16} />
              {trainer.email}
            </a>
          )}
        </div>
      </section>

      <Card title="Upcoming classes" subtitle="Next 14 days">
        {classesQuery.error ? (
          <ErrorState message={classesQuery.error} onRetry={classesQuery.refetch} compact />
        ) : classesQuery.loading ? (
          <SkeletonGrid count={3} lines={4} label="Loading classes…" />
        ) : classes.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No upcoming classes"
            message={`${trainer.name || 'This trainer'} has no classes scheduled in the next two weeks.`}
            action={
              <Button variant="secondary" to="/app/classes" icon="calendar">
                Browse all classes
              </Button>
            }
            compact
          />
        ) : (
          <ul className={styles.classGrid}>
            {classes.map((c) => (
              <li key={c._id}>
                <ClassCard
                  gymClass={c}
                  pending={pendingId === c._id}
                  onBook={(gc) => setConfirm({ mode: 'book', gymClass: gc })}
                  onCancel={(gc) => setConfirm({ mode: 'cancel', gymClass: gc })}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.mode === 'cancel' ? 'Cancel this booking?' : 'Book this class?'}
        message={
          confirm
            ? `${confirm.gymClass.title} · ${formatDateTime(confirm.gymClass.startTime)}${
                confirm.gymClass.location ? ` · ${confirm.gymClass.location}` : ''
              }`
            : ''
        }
        confirmLabel={confirm?.mode === 'cancel' ? 'Cancel booking' : 'Book class'}
        cancelLabel={confirm?.mode === 'cancel' ? 'Keep booking' : 'Not now'}
        danger={confirm?.mode === 'cancel'}
        onConfirm={() => (confirm?.mode === 'cancel' ? handleCancel(confirm.gymClass) : handleBook(confirm.gymClass))}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

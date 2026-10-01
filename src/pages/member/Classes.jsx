import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import ClassCard from '../../components/common/ClassCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Icon from '../../components/common/Icon';
import { SkeletonGrid } from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import { getClasses } from '../../api/classApi';
import { getTrainers } from '../../api/trainerApi';
import { createBooking, cancelBooking, getMyBookings } from '../../api/bookingApi';
import { getErrorMessage, toList } from '../../api/axios';
import { CLASS_TYPES, TIME_OF_DAY } from '../../utils/constants';
import {
  addDays,
  endOfDay,
  formatDate,
  formatTime,
  formatWeekday,
  isSameDay,
  startOfWeek,
  toISODate,
} from '../../utils/formatDate';
import styles from '../../styles/Classes.module.css';

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

function weekLabel(start) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return `${formatDate(start, { month: 'short', day: 'numeric' })} – ${formatDate(
    end,
    sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }
  )}`;
}

export default function Classes() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState('calendar');
  const [type, setType] = useState('');
  const [trainer, setTrainer] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [confirm, setConfirm] = useState(null); // { action: 'book'|'cancel', gymClass }
  const [pendingId, setPendingId] = useState(null);

  const weekKey = weekStart.getTime();
  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date()));

  const {
    data: classesData,
    loading,
    error,
    refetch,
    setData: setClassesData,
  } = useFetch(
    () =>
      getClasses({
        from: weekStart.toISOString(),
        to: endOfDay(addDays(weekStart, 6)).toISOString(),
        type,
        trainer,
        limit: 200,
        sort: 'startTime',
      }),
    [weekKey, type, trainer]
  );

  const { data: trainersData } = useFetch(() => getTrainers({ limit: 100 }), []);
  const {
    data: bookingsData,
    refetch: refetchBookings,
    setData: setBookingsData,
  } = useFetch(() => getMyBookings({ status: 'booked', limit: 200 }), []);

  const trainerOptions = useMemo(
    () => toList(trainersData).map((t) => ({ value: t._id, label: t.name })),
    [trainersData]
  );

  const bookingByClass = useMemo(() => {
    const map = new Map();
    toList(bookingsData).forEach((b) => {
      if (b?.status === 'booked' && b.gymClass) map.set(idOf(b.gymClass), b._id);
    });
    return map;
  }, [bookingsData]);

  const classes = useMemo(() => {
    const slot = TIME_OF_DAY.find((t) => t.value === timeOfDay);
    return toList(classesData)
      .filter((c) => {
        if (!slot) return true;
        const h = new Date(c.startTime).getHours();
        return h >= slot.from && h < slot.to;
      })
      .map((c) => (c.isBookedByMe === undefined && bookingByClass.has(c._id) ? { ...c, isBookedByMe: true } : c))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [classesData, timeOfDay, bookingByClass]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return { date, key: toISODate(date), classes: classes.filter((c) => isSameDay(c.startTime, date)) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekKey, classes]
  );

  const filtersActive = Boolean(type || trainer || timeOfDay);

  const patchClass = (id, patch) =>
    setClassesData((prev) =>
      prev ? { ...prev, data: toList(prev).map((c) => (c._id === id ? { ...c, ...patch } : c)) } : prev
    );

  const handleConfirm = async () => {
    if (!confirm) return;
    const { action, gymClass } = confirm;
    const id = gymClass._id;
    const before = { isBookedByMe: gymClass.isBookedByMe, bookedCount: gymClass.bookedCount ?? 0 };
    setPendingId(id);

    if (action === 'book') {
      patchClass(id, { isBookedByMe: true, bookedCount: before.bookedCount + 1 });
      try {
        const booking = await createBooking(id);
        if (booking?._id) {
          setBookingsData((prev) => ({
            ...(prev || {}),
            data: [...toList(prev), { ...booking, gymClass: booking.gymClass || id, status: booking.status || 'booked' }],
          }));
        } else {
          refetchBookings();
        }
        toast.success(`Booked ${gymClass.title}!`);
      } catch (err) {
        patchClass(id, before);
        toast.error(getErrorMessage(err));
      }
    } else {
      let bookingId = bookingByClass.get(id);
      if (!bookingId) {
        const fresh = await refetchBookings();
        bookingId = toList(fresh).find((b) => b.status === 'booked' && idOf(b.gymClass) === id)?._id;
      }
      if (!bookingId) {
        toast.error("Couldn't find your booking for this class. Please refresh and try again.");
      } else {
        patchClass(id, { isBookedByMe: false, bookedCount: Math.max(0, before.bookedCount - 1) });
        try {
          await cancelBooking(bookingId);
          setBookingsData((prev) => ({ ...(prev || {}), data: toList(prev).filter((b) => b._id !== bookingId) }));
          toast.success('Booking cancelled');
        } catch (err) {
          patchClass(id, before);
          toast.error(getErrorMessage(err));
        }
      }
    }
    setPendingId(null);
    setConfirm(null);
  };

  const cardProps = (c) => ({
    gymClass: c,
    pending: pendingId === c._id,
    onBook: (gc) => setConfirm({ action: 'book', gymClass: gc }),
    onCancel: (gc) => setConfirm({ action: 'cancel', gymClass: gc }),
    trainerLinkBase: '/app/trainers',
  });

  const clearFilters = () => {
    setType('');
    setTrainer('');
    setTimeOfDay('');
  };

  let content;
  if (loading && !classesData) content = <SkeletonGrid count={6} label="Loading classes…" />;
  else if (error) content = <ErrorState message={error} onRetry={refetch} />;
  else if (classes.length === 0)
    content = (
      <EmptyState
        icon="calendar"
        title={filtersActive ? 'No classes match your filters' : 'No classes scheduled this week'}
        message={filtersActive ? 'Try a different type, trainer or time of day.' : 'Check the next week for upcoming sessions.'}
        action={
          filtersActive ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button variant="secondary" iconRight="chevronRight" onClick={() => setWeekStart((w) => addDays(w, 7))}>
              Next week
            </Button>
          )
        }
      />
    );
  else if (view === 'calendar')
    content = (
      <div className={styles.calendar} aria-busy={loading || undefined}>
        {days.map((d) => {
          const today = isSameDay(d.date, new Date());
          return (
            <section key={d.key} className={`${styles.dayCol} ${today ? styles.today : ''}`} aria-labelledby={`day-${d.key}`}>
              <h2 id={`day-${d.key}`} className={styles.dayHead}>
                <span className={styles.dayName}>{formatWeekday(d.date)}</span>
                <span className={styles.dayNum}>{d.date.getDate()}</span>
                {today && <span className="sr-only">(today)</span>}
              </h2>
              {d.classes.length === 0 ? (
                <p className={styles.noClasses}>No classes</p>
              ) : (
                <ul className={styles.dayList}>
                  {d.classes.map((c) => (
                    <li key={c._id}>
                      <ClassCard {...cardProps(c)} compact />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    );
  else
    content = (
      <div className={styles.list} aria-busy={loading || undefined}>
        {days
          .filter((d) => d.classes.length > 0)
          .map((d) => (
            <section key={d.key} aria-labelledby={`list-${d.key}`} className={styles.listGroup}>
              <h2 id={`list-${d.key}`} className={styles.groupHead}>
                {formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                {isSameDay(d.date, new Date()) && <span className={styles.todayTag}>Today</span>}
                <span className={styles.groupCount}>
                  {d.classes.length} class{d.classes.length === 1 ? '' : 'es'}
                </span>
              </h2>
              <ul className={styles.cardGrid}>
                {d.classes.map((c) => (
                  <li key={c._id}>
                    <ClassCard {...cardProps(c)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    );

  const confirmClass = confirm?.gymClass;
  const when = confirmClass
    ? `${formatWeekday(confirmClass.startTime)} ${formatTime(confirmClass.startTime)}`
    : '';

  return (
    <>
      <PageHeader title="Classes" subtitle="Find your next session and lock in your spot." />

      <div className={styles.toolbar}>
        <nav className={styles.weekNav} aria-label="Week navigation">
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            icon="chevronLeft"
            aria-label="Previous week"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          />
          <p className={styles.weekLabel} aria-live="polite">
            {weekLabel(weekStart)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            icon="chevronRight"
            aria-label="Next week"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={isThisWeek}
          >
            This week
          </Button>
        </nav>

        <div className={styles.segmented} role="group" aria-label="View">
          <button
            type="button"
            className={`${styles.segment} ${view === 'calendar' ? styles.segmentOn : ''}`}
            aria-pressed={view === 'calendar'}
            onClick={() => setView('calendar')}
          >
            <Icon name="grid" size={16} /> Calendar
          </button>
          <button
            type="button"
            className={`${styles.segment} ${view === 'list' ? styles.segmentOn : ''}`}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <Icon name="list" size={16} /> List
          </button>
        </div>
      </div>

      <div className={styles.filters} role="search" aria-label="Filter classes">
        <Select label="Type" placeholder="All types" options={CLASS_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
        <Select
          label="Trainer"
          placeholder="All trainers"
          options={trainerOptions}
          value={trainer}
          onChange={(e) => setTrainer(e.target.value)}
        />
        <Select
          label="Time of day"
          placeholder="Any time"
          options={TIME_OF_DAY}
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" icon="close" onClick={clearFilters} className={styles.clearBtn}>
            Clear
          </Button>
        )}
      </div>

      {content}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === 'cancel' ? 'Cancel booking?' : 'Confirm booking'}
        message={
          confirmClass
            ? confirm.action === 'cancel'
              ? `Cancel your spot in ${confirmClass.title} on ${when}?`
              : `Book ${confirmClass.title} on ${when}?`
            : ''
        }
        confirmLabel={confirm?.action === 'cancel' ? 'Cancel booking' : 'Book class'}
        cancelLabel={confirm?.action === 'cancel' ? 'Keep it' : 'Not now'}
        danger={confirm?.action === 'cancel'}
        loading={Boolean(pendingId)}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Tabs, { TabPanel } from '../../components/common/Tabs';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonCard } from '../../components/common/Skeleton';
import { classTypeLabel } from '../../components/common/ClassCard';
import useFetch from '../../hooks/useFetch';
import { cancelBooking, getMyBookings } from '../../api/bookingApi';
import { getErrorMessage, toList } from '../../api/axios';
import { formatDate, formatDateTime, formatTimeRange, relativeDay } from '../../utils/formatDate';
import styles from '../../styles/MyBookings.module.css';

const TABS_ID = 'my-bookings';

const PAST_STATUS = {
  attended: { tone: 'success', label: 'Attended' },
  no_show: { tone: 'danger', label: 'No show' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  booked: { tone: 'warning', label: 'Missed' },
};

function BookingRow({ booking, upcoming, onCancel, pending }) {
  const c = booking.gymClass;
  const start = new Date(c.startTime);
  const status = PAST_STATUS[booking.status] || { tone: 'neutral', label: booking.status };
  const trainer = c.trainer && typeof c.trainer === 'object' ? c.trainer : null;

  return (
    <article className={`${styles.row} ${upcoming ? styles.upcoming : ''} ${booking.status === 'cancelled' ? styles.cancelled : ''}`}>
      <div className={styles.dateBlock} aria-hidden="true">
        <span className={styles.month}>{formatDate(start, { month: 'short' })}</span>
        <span className={styles.day}>{start.getDate()}</span>
        <span className={styles.weekday}>{formatDate(start, { weekday: 'short' })}</span>
      </div>

      <div className={styles.info}>
        <p className={styles.type}>{classTypeLabel(c.type)}</p>
        <h3 className={styles.title}>{c.title}</h3>
        <p className="sr-only">{formatDateTime(c.startTime)}</p>
        <ul className={styles.meta}>
          <li>
            <Icon name="clock" size={15} />
            {upcoming ? `${relativeDay(c.startTime)} · ` : ''}
            {formatTimeRange(c.startTime, c.endTime)}
          </li>
          {c.location && (
            <li>
              <Icon name="mapPin" size={15} />
              {c.location}
            </li>
          )}
          {trainer && (
            <li className={styles.trainer}>
              <Avatar src={trainer.avatarUrl} name={trainer.name} size={22} />
              <Link to={`/app/trainers/${trainer._id}`}>{trainer.name}</Link>
            </li>
          )}
        </ul>
      </div>

      <div className={styles.action}>
        {upcoming ? (
          <Button variant="outline" size="sm" icon="close" loading={pending} onClick={() => onCancel(booking)}>
            Cancel
          </Button>
        ) : (
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        )}
      </div>
    </article>
  );
}

export default function MyBookings() {
  const [tab, setTab] = useState('upcoming');
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { data, loading, error, refetch, setData } = useFetch(
    () => getMyBookings({ limit: 100, sort: 'gymClass.startTime' }),
    []
  );

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const valid = toList(data).filter((b) => b?.gymClass && typeof b.gymClass === 'object' && b.gymClass.startTime);
    const up = [];
    const pa = [];
    valid.forEach((b) => {
      const t = new Date(b.gymClass.startTime).getTime();
      if (b.status === 'booked' && t > now) up.push(b);
      else pa.push(b);
    });
    up.sort((a, b) => new Date(a.gymClass.startTime) - new Date(b.gymClass.startTime));
    pa.sort((a, b) => new Date(b.gymClass.startTime) - new Date(a.gymClass.startTime));
    return { upcoming: up, past: pa };
  }, [data]);

  const handleCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await cancelBooking(toCancel._id);
      setData((prev) =>
        prev ? { ...prev, data: toList(prev).map((b) => (b._id === toCancel._id ? { ...b, status: 'cancelled' } : b)) } : prev
      );
      toast.success('Booking cancelled');
      setToCancel(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: loading ? undefined : upcoming.length },
    { id: 'past', label: 'Past', count: loading ? undefined : past.length },
  ];

  const renderList = (items, isUpcoming) => {
    if (items.length === 0) {
      return isUpcoming ? (
        <EmptyState
          icon="ticket"
          title="No upcoming bookings"
          message="Grab a spot in a class and it will show up here."
          action={
            <Button to="/app/classes" iconRight="arrowRight">
              Browse classes
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon="clock"
          title="No past bookings yet"
          message="Your class history will appear here after your first session."
          action={
            <Button to="/app/classes" variant="secondary">
              Find a class
            </Button>
          }
        />
      );
    }
    return (
      <ul className={styles.list}>
        {items.map((b) => (
          <li key={b._id}>
            <BookingRow
              booking={b}
              upcoming={isUpcoming}
              pending={cancelling && toCancel?._id === b._id}
              onCancel={setToCancel}
            />
          </li>
        ))}
      </ul>
    );
  };

  let body;
  if (loading)
    body = (
      <div role="status" aria-live="polite" className={styles.list}>
        <span className="sr-only">Loading bookings…</span>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    );
  else if (error) body = <ErrorState message={error} onRetry={refetch} />;
  else
    body = (
      <>
        <TabPanel idPrefix={TABS_ID} id="upcoming" value={tab}>
          {renderList(upcoming, true)}
        </TabPanel>
        <TabPanel idPrefix={TABS_ID} id="past" value={tab}>
          {renderList(past, false)}
        </TabPanel>
      </>
    );

  return (
    <>
      <PageHeader
        title="My bookings"
        subtitle="Your upcoming sessions and class history."
        actions={
          <Button to="/app/classes" icon="plus">
            Book a class
          </Button>
        }
      />
      <div className={styles.tabs}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Bookings" idPrefix={TABS_ID} />
      </div>
      {body}

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel booking?"
        message={
          toCancel
            ? `Cancel your spot in ${toCancel.gymClass.title} on ${formatDateTime(toCancel.gymClass.startTime)}? Your spot will be released to other members.`
            : ''
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

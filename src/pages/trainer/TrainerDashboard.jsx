import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/common/StatCard';
import ClassCard, { classTypeLabel } from '../../components/common/ClassCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Icon from '../../components/common/Icon';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton, { SkeletonGrid } from '../../components/common/Skeleton';
import RosterModal from '../../components/trainer/RosterModal';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { getTrainerClients } from '../../api/trainerApi';
import { getClasses } from '../../api/classApi';
import { toList } from '../../api/axios';
import { formatNumber } from '../../utils/formatCurrency';
import {
  addDays,
  endOfDay,
  formatDate,
  formatTimeRange,
  isSameDay,
  startOfDay,
  startOfWeek,
} from '../../utils/formatDate';
import styles from '../../styles/TrainerDashboard.module.css';

const byStart = (a, b) => new Date(a.startTime) - new Date(b.startTime);

export default function TrainerDashboard() {
  const { user } = useAuth();
  const trainerId = user?._id;
  const [rosterClass, setRosterClass] = useState(null);

  // One window covering this Mon–Sun week plus the next 7 days for the agenda.
  const range = useMemo(() => {
    const today = startOfDay();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfDay(addDays(weekStart, 6));
    const agendaEnd = endOfDay(addDays(today, 7));
    return {
      today,
      weekStart,
      weekEnd,
      agendaEnd,
      from: weekStart,
      to: agendaEnd > weekEnd ? agendaEnd : weekEnd,
    };
  }, []);

  const clientsQ = useFetch(() => getTrainerClients(trainerId, { limit: 5 }), [trainerId]);
  const classesQ = useFetch(
    () =>
      getClasses({
        trainer: trainerId,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        limit: 200,
      }),
    [trainerId, range]
  );

  const classes = useMemo(() => toList(classesQ.data).slice().sort(byStart), [classesQ.data]);
  const todays = classes.filter((c) => isSameDay(c.startTime, range.today));
  const thisWeek = classes.filter((c) => {
    const s = new Date(c.startTime);
    return s >= range.weekStart && s <= range.weekEnd;
  });
  const bookedThisWeek = thisWeek.reduce((sum, c) => sum + (Number(c.bookedCount) || 0), 0);
  const capacityThisWeek = thisWeek.reduce((sum, c) => sum + (Number(c.capacity) || 0), 0);

  const agenda = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i += 1) {
      const day = addDays(range.today, i);
      days.push({ day, items: classes.filter((c) => isSameDay(c.startTime, day)) });
    }
    return days;
  }, [classes, range.today]);

  const clients = toList(clientsQ.data);
  const firstName = user?.name?.split(' ')[0] || 'Coach';

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Trainer hub"
        title={`Let's go, ${firstName}`}
        subtitle={`${formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })} — here's your day at a glance.`}
        actions={
          <>
            <Button variant="secondary" icon="users" to="/trainer/clients">
              Clients
            </Button>
            <Button icon="calendar" to="/trainer/classes">
              My classes
            </Button>
          </>
        }
      />

      <section className={styles.stats} aria-label="Key stats">
        <StatCard
          label="Clients"
          value={clientsQ.error ? '—' : formatNumber(clientsQ.data?.total ?? clients.length)}
          icon="users"
          tone="primary"
          loading={clientsQ.loading}
          hint="Assigned to you"
        />
        <StatCard
          label="Classes today"
          value={classesQ.error ? '—' : todays.length}
          icon="clock"
          tone="accent"
          loading={classesQ.loading}
          hint={todays[0] ? `Next: ${formatTimeRange(todays[0].startTime, todays[0].endTime)}` : 'Nothing scheduled'}
        />
        <StatCard
          label="Classes this week"
          value={classesQ.error ? '—' : thisWeek.length}
          icon="calendar"
          tone="info"
          loading={classesQ.loading}
          hint="Mon – Sun"
        />
        <StatCard
          label="Booked spots"
          value={classesQ.error ? '—' : formatNumber(bookedThisWeek)}
          icon="ticket"
          tone="success"
          loading={classesQ.loading}
          hint={capacityThisWeek ? `of ${formatNumber(capacityThisWeek)} spots this week` : 'This week'}
        />
      </section>

      <div className={styles.columns}>
        <section className={styles.today} aria-labelledby="today-heading">
          <div className={styles.sectionHead}>
            <h2 id="today-heading" className={styles.sectionTitle}>
              Today&apos;s classes
            </h2>
            <Link to="/trainer/classes" className={styles.link}>
              All classes <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          {classesQ.loading ? (
            <SkeletonGrid count={2} minWidth={240} label="Loading today's classes…" />
          ) : classesQ.error ? (
            <ErrorState message={classesQ.error} onRetry={classesQ.refetch} compact />
          ) : todays.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No classes today"
              message="Enjoy the breather — or schedule something new."
              action={
                <Button size="sm" icon="plus" to="/trainer/classes">
                  Schedule a class
                </Button>
              }
              compact
            />
          ) : (
            <div className={styles.classGrid}>
              {todays.map((c) => (
                <ClassCard
                  key={c._id}
                  gymClass={c}
                  actions={
                    <Button size="sm" variant="outline" icon="clipboard" onClick={() => setRosterClass(c)}>
                      Roster
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <aside className={styles.side}>
          <Card title="Next 7 days" subtitle="Your upcoming agenda">
            {classesQ.loading ? (
              <Skeleton count={5} height={14} />
            ) : classesQ.error ? (
              <ErrorState message={classesQ.error} onRetry={classesQ.refetch} compact />
            ) : agenda.every((d) => d.items.length === 0) ? (
              <EmptyState icon="calendar" title="Clear week ahead" message="No classes in the next 7 days." compact />
            ) : (
              <ol className={styles.agenda}>
                {agenda.map(({ day, items }) => (
                  <li key={day.toISOString()} className={styles.agendaDay}>
                    <div className={styles.agendaDate}>
                      <span className={styles.agendaWeekday}>{formatDate(day, { weekday: 'short' })}</span>
                      <span className={styles.agendaNum}>{day.getDate()}</span>
                    </div>
                    {items.length === 0 ? (
                      <span className={styles.agendaEmpty}>Rest day</span>
                    ) : (
                      <ul className={styles.agendaItems}>
                        {items.map((c) => (
                          <li key={c._id} className={styles.agendaItem}>
                            <span className={styles.agendaTitle}>{c.title}</span>
                            <span className={styles.agendaMeta}>
                              {formatTimeRange(c.startTime, c.endTime)} · {classTypeLabel(c.type)} ·{' '}
                              {c.bookedCount ?? 0}/{c.capacity ?? 0}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card
            title="Recent clients"
            actions={
              <Link to="/trainer/clients" className={styles.link}>
                View all <Icon name="arrowRight" size={14} />
              </Link>
            }
          >
            {clientsQ.loading ? (
              <Skeleton count={4} height={14} />
            ) : clientsQ.error ? (
              <ErrorState message={clientsQ.error} onRetry={clientsQ.refetch} compact />
            ) : clients.length === 0 ? (
              <EmptyState icon="users" title="No clients yet" message="Members assigned to you will appear here." compact />
            ) : (
              <ul className={styles.clients}>
                {clients.slice(0, 5).map((c) => {
                  const status = c.membership?.status || c.membershipStatus;
                  return (
                    <li key={c._id}>
                      <Link to={`/trainer/clients/${c._id}`} className={styles.clientRow}>
                        <Avatar src={c.avatarUrl} name={c.name} size={36} />
                        <span className={styles.clientText}>
                          <span className={styles.clientName}>{c.name}</span>
                          <span className={styles.clientEmail}>{c.email}</span>
                        </span>
                        {status && <Badge status={status} size="sm" />}
                        <Icon name="chevronRight" size={16} className={styles.chev} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <RosterModal gymClass={rosterClass} open={Boolean(rosterClass)} onClose={() => setRosterClass(null)} />
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import ProgressBar from '../../components/common/ProgressBar';
import ClassCard from '../../components/common/ClassCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Skeleton from '../../components/common/Skeleton';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import useChartColors from '../../hooks/useChartColors';
import { getMyMembership } from '../../api/membershipApi';
import { checkIn, getMyBookings } from '../../api/bookingApi';
import { getMyWorkouts } from '../../api/workoutApi';
import { getMyProgress } from '../../api/progressApi';
import { getErrorMessage, toList } from '../../api/axios';
import {
  addDays,
  daysBetween,
  daysLeft,
  endOfDay,
  formatDate,
  formatShortDate,
  formatTime,
  isSameDay,
  startOfDay,
  startOfWeek,
  toISODate,
} from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatCurrency';
import { WEEKDAYS } from '../../utils/constants';
import styles from '../../styles/Dashboard.module.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function CardLoading({ lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className={styles.loading}>
      <span className="sr-only">Loading…</span>
      <Skeleton height={28} width="40%" />
      <Skeleton count={lines} height={12} />
    </div>
  );
}

/* ---------- Membership ---------- */
function MembershipCard() {
  const { data: membership, loading, error, refetch } = useFetch(() => getMyMembership(), []);

  let body;
  if (loading) body = <CardLoading />;
  else if (error) body = <ErrorState compact message={error} onRetry={refetch} />;
  else if (!membership)
    body = (
      <EmptyState
        compact
        icon="card"
        title="No active membership"
        message="Pick a plan to unlock classes, trainers and the full gym floor."
        action={
          <Button to="/app/membership" iconRight="arrowRight">
            Choose a plan
          </Button>
        }
      />
    );
  else {
    const plan = membership.plan && typeof membership.plan === 'object' ? membership.plan : null;
    const total =
      Number(plan?.durationDays) || Math.max(1, daysBetween(membership.startDate, membership.endDate));
    const left = daysLeft(membership.endDate);
    const elapsed = Math.min(total, Math.max(0, total - left));
    body = (
      <div className={styles.membership}>
        <div className={styles.membershipTop}>
          <div>
            <p className={styles.planName}>{plan?.name || 'Membership'}</p>
            <p className={styles.muted}>Ends {formatDate(membership.endDate)}</p>
          </div>
          <Badge status={membership.status} dot />
        </div>
        <p className={styles.bigNumber}>
          {left}
          <span className={styles.bigUnit}> day{left === 1 ? '' : 's'} left</span>
        </p>
        <ProgressBar value={elapsed} max={total} label={`${elapsed} of ${total} days used`} showValue />
        <Link to="/app/membership" className={styles.cardLink}>
          Manage membership <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <Card title="Membership" className={styles.span1} actions={<Icon name="card" className={styles.cardIcon} />}>
      {body}
    </Card>
  );
}

/* ---------- Check-in ---------- */
function CheckInCard() {
  const [pending, setPending] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);

  const handleCheckIn = async () => {
    setPending(true);
    try {
      const res = await checkIn();
      const at = res?.checkInAt || res?.checkedInAt || res?.createdAt || res?.date || new Date().toISOString();
      setCheckedAt(at);
      toast.success("You're checked in. Have a great session!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card title="Gym check-in" className={styles.span1} actions={<Icon name="logIn" className={styles.cardIcon} />}>
      <div className={styles.checkin}>
        {checkedAt ? (
          <div className={styles.checkedIn} role="status">
            <span className={styles.checkBadge}>
              <Icon name="check" size={32} strokeWidth={2.4} />
            </span>
            <p className={styles.checkTitle}>Checked in at {formatTime(checkedAt)}</p>
            <p className={styles.muted}>Crush it today.</p>
          </div>
        ) : (
          <>
            <p className={styles.muted}>Arrived at the gym? Tap to log your visit.</p>
            <button
              type="button"
              className={styles.checkButton}
              onClick={handleCheckIn}
              disabled={pending}
              aria-busy={pending || undefined}
            >
              <Icon name={pending ? 'refresh' : 'bolt'} size={34} className={pending ? styles.spin : undefined} />
              <span>{pending ? 'Checking in…' : 'Check in'}</span>
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

/* ---------- Today's classes ---------- */
function TodayClassesCard() {
  const { data, loading, error, refetch } = useFetch(
    () => getMyBookings({ status: 'booked', limit: 100, sort: 'gymClass.startTime' }),
    []
  );

  const today = useMemo(() => {
    const now = new Date();
    return toList(data)
      .filter((b) => b?.status === 'booked' && b.gymClass && typeof b.gymClass === 'object')
      .filter((b) => isSameDay(b.gymClass.startTime, now))
      .map((b) => ({ ...b.gymClass, isBookedByMe: true }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [data]);

  let body;
  if (loading) body = <CardLoading lines={4} />;
  else if (error) body = <ErrorState compact message={error} onRetry={refetch} />;
  else if (today.length === 0)
    body = (
      <EmptyState
        compact
        icon="calendar"
        title="Nothing booked today"
        message="Find a class that fits your schedule."
        action={
          <Button to="/app/classes" variant="secondary" iconRight="arrowRight">
            Browse classes
          </Button>
        }
      />
    );
  else
    body = (
      <ul className={styles.classList}>
        {today.map((c) => (
          <li key={c._id}>
            <ClassCard gymClass={c} compact trainerLinkBase="/app/trainers" />
          </li>
        ))}
      </ul>
    );

  return (
    <Card
      title="Today's classes"
      subtitle={formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
      className={styles.span1}
      actions={
        <Button to="/app/bookings" variant="ghost" size="sm" iconRight="arrowRight">
          All bookings
        </Button>
      }
    >
      {body}
    </Card>
  );
}

/* ---------- Weekly streak ---------- */
function computeStreak(daySet) {
  let cursor = startOfDay(new Date());
  // If nothing logged today yet, the streak is still alive from yesterday.
  if (!daySet.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (daySet.has(toISODate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function StreakCard() {
  const { data, loading, error, refetch } = useFetch(() => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfDay(addDays(weekStart, 6));
    const monthStart = startOfDay(addDays(new Date(), -30));
    return Promise.all([
      getMyWorkouts({ from: weekStart.toISOString(), to: weekEnd.toISOString(), limit: 100 }),
      getMyWorkouts({ from: monthStart.toISOString(), to: endOfDay(new Date()).toISOString(), limit: 200 }),
    ]).then(([week, month]) => ({ week: toList(week), month: toList(month) }));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const weekStart = startOfWeek(new Date());
    const weekKeys = new Set(data.week.map((w) => toISODate(w.date)));
    const days = WEEKDAYS.map((label, i) => {
      const d = addDays(weekStart, i);
      return { label, date: d, done: weekKeys.has(toISODate(d)), isToday: isSameDay(d, new Date()) };
    });
    const monthKeys = new Set(data.month.map((w) => toISODate(w.date)));
    return { days, count: data.week.length, streak: computeStreak(monthKeys) };
  }, [data]);

  let body;
  if (loading) body = <CardLoading lines={2} />;
  else if (error) body = <ErrorState compact message={error} onRetry={refetch} />;
  else
    body = (
      <div className={styles.streak}>
        <ol className={styles.dots} aria-label="Workout days this week">
          {stats.days.map((d) => (
            <li key={d.label} className={styles.dotItem}>
              <span
                className={`${styles.dot} ${d.done ? styles.dotOn : ''} ${d.isToday ? styles.dotToday : ''}`}
                aria-hidden="true"
              >
                {d.done && <Icon name="check" size={14} strokeWidth={3} />}
              </span>
              <span className={styles.dotLabel}>
                {d.label}
                <span className="sr-only">
                  {' '}
                  {formatShortDate(d.date)}: {d.done ? 'workout logged' : 'no workout'}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <div className={styles.streakStats}>
          <p>
            <strong className={styles.statNum}>{stats.count}</strong>
            <span className={styles.muted}> workout{stats.count === 1 ? '' : 's'} this week</span>
          </p>
          <p className={styles.flame}>
            <Icon name="flame" size={20} />
            <strong className={styles.statNum}>{stats.streak}</strong>
            <span className={styles.muted}> day streak</span>
          </p>
        </div>
        {stats.count === 0 && (
          <Link to="/app/workouts" className={styles.cardLink}>
            Log your first workout this week <Icon name="arrowRight" size={16} />
          </Link>
        )}
      </div>
    );

  return (
    <Card title="This week" className={styles.span1} actions={<Icon name="flame" className={styles.cardIcon} />}>
      {body}
    </Card>
  );
}

/* ---------- Weight chart ---------- */
function WeightCard() {
  const c = useChartColors();
  const { data, loading, error, refetch } = useFetch(
    () => getMyProgress({ from: startOfDay(addDays(new Date(), -30)).toISOString(), limit: 100, sort: 'date' }),
    []
  );

  const points = useMemo(
    () =>
      toList(data)
        .filter((p) => p?.weightKg !== undefined && p?.weightKg !== null && p.weightKg !== '')
        .map((p) => ({ date: p.date, weight: Number(p.weightKg) }))
        .filter((p) => Number.isFinite(p.weight))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((p) => ({ ...p, label: formatShortDate(p.date) })),
    [data]
  );

  let body;
  if (loading) body = <CardLoading lines={4} />;
  else if (error) body = <ErrorState compact message={error} onRetry={refetch} />;
  else if (points.length === 0)
    body = (
      <EmptyState
        compact
        icon="scale"
        title="No weigh-ins yet"
        message="Log your weight to see your 30-day trend."
        action={
          <Button to="/app/progress" variant="secondary" icon="plus">
            Add entry
          </Button>
        }
      />
    );
  else {
    const latest = points[points.length - 1].weight;
    const change = latest - points[0].weight;
    const values = points.map((p) => p.weight);
    const min = Math.floor(Math.min(...values) - 1);
    const max = Math.ceil(Math.max(...values) + 1);
    body = (
      <div className={styles.weight}>
        <div className={styles.weightStats}>
          <p>
            <strong className={styles.statNum}>{formatNumber(latest, { maximumFractionDigits: 1 })}</strong>
            <span className={styles.muted}> kg latest</span>
          </p>
          <p className={change <= 0 ? styles.changeDown : styles.changeUp}>
            <Icon name={change <= 0 ? 'trendingDown' : 'trendingUp'} size={16} />
            {change > 0 ? '+' : ''}
            {formatNumber(change, { maximumFractionDigits: 1 })} kg
            <span className={styles.muted}> in 30 days</span>
          </p>
        </div>
        <div className={styles.chart} role="img" aria-label={`Weight trend over 30 days, latest ${latest} kg`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="dashWeightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.series[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={c.series[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={c.tickStyle} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis domain={[min, max]} tick={c.tickStyle} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                contentStyle={c.tooltipStyle}
                labelStyle={{ color: c.text }}
                formatter={(v) => [`${v} kg`, 'Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke={c.series[0]}
                strokeWidth={2.5}
                fill="url(#dashWeightFill)"
                dot={points.length < 12 ? { r: 3, fill: c.series[0], strokeWidth: 0 } : false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <Card
      title="Weight · 30 days"
      className={styles.span2}
      actions={
        <Button to="/app/progress" variant="ghost" size="sm" iconRight="arrowRight">
          Progress
        </Button>
      }
    >
      {body}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        subtitle="Here's your training snapshot for today."
        actions={
          <Button to="/app/workouts" icon="plus">
            Log workout
          </Button>
        }
      />
      <div className={styles.grid}>
        <MembershipCard />
        <CheckInCard />
        <StreakCard />
        <TodayClassesCard />
        <WeightCard />
      </div>
    </>
  );
}

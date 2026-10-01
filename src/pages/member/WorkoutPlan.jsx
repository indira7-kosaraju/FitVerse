import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Tabs, { TabPanel } from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import Avatar from '../../components/common/Avatar';
import Icon from '../../components/common/Icon';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import Skeleton from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import { completePlanDay, getMyPlan } from '../../api/workoutApi';
import { getErrorMessage } from '../../api/axios';
import styles from '../../styles/WorkoutPlan.module.css';

const TABS_ID = 'plan-weeks';

const fetchPlan = () =>
  getMyPlan().catch((err) => {
    if (err?.response?.status === 404) return null;
    throw err;
  });

function Ring({ pct }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  return (
    <div className={styles.ring} role="img" aria-label={`${pct}% of plan completed`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.ringTrack} cx="50" cy="50" r={r} />
        <circle
          className={styles.ringFill}
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
        />
      </svg>
      <span className={styles.ringValue}>
        {pct}
        <small>%</small>
      </span>
    </div>
  );
}

const countDays = (days = []) => ({ total: days.length, done: days.filter((d) => d.completed).length });

export default function WorkoutPlan() {
  const { data: plan, loading, error, refetch, setData } = useFetch(fetchPlan, []);
  const [week, setWeek] = useState(null);
  const [pendingDay, setPendingDay] = useState(null);

  const weeks = useMemo(() => (Array.isArray(plan?.weeks) ? plan.weeks : []), [plan]);

  const progress = useMemo(() => {
    const perWeek = weeks.map((w) => countDays(w.days));
    const total = perWeek.reduce((s, w) => s + w.total, 0);
    const done = perWeek.reduce((s, w) => s + w.done, 0);
    return { perWeek, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [weeks]);

  // Default to the first week that still has work left.
  useEffect(() => {
    if (week !== null || weeks.length === 0) return;
    const idx = weeks.findIndex((w) => (w.days || []).some((d) => !d.completed));
    setWeek(String(idx === -1 ? 0 : idx));
  }, [weeks, week]);

  const toggleDay = async (dayId, nextCompleted) => {
    const previous = plan;
    setPendingDay(dayId);
    setData((p) =>
      p
        ? {
            ...p,
            weeks: p.weeks.map((w) => ({
              ...w,
              days: (w.days || []).map((d) => (d._id === dayId ? { ...d, completed: nextCompleted } : d)),
            })),
          }
        : p
    );
    try {
      const updated = await completePlanDay(plan._id, dayId, nextCompleted);
      if (updated && Array.isArray(updated.weeks)) setData((p) => ({ ...p, ...updated }));
      toast.success(nextCompleted ? 'Day completed. Keep it up!' : 'Marked as not completed');
    } catch (err) {
      setData(previous);
      toast.error(getErrorMessage(err));
    } finally {
      setPendingDay(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Workout plan" subtitle="Your personalised program." />
        <div className={styles.heroSkeleton} aria-hidden="true">
          <Skeleton height={28} width="50%" />
          <Skeleton count={2} height={12} />
        </div>
        <SkeletonGrid count={3} lines={4} label="Loading your plan…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Workout plan" subtitle="Your personalised program." />
        <ErrorState message={error} onRetry={refetch} />
      </>
    );
  }

  if (!plan || weeks.length === 0) {
    return (
      <>
        <PageHeader title="Workout plan" subtitle="Your personalised program." />
        <EmptyState
          icon="clipboard"
          title="Your trainer hasn't assigned a plan yet"
          message="Connect with a trainer to get a program built around your goals."
          action={
            <Button to="/app/trainers" iconRight="arrowRight">
              Browse trainers
            </Button>
          }
        />
      </>
    );
  }

  const trainer = plan.trainer && typeof plan.trainer === 'object' ? plan.trainer : null;
  const tabs = weeks.map((_, i) => ({ id: String(i), label: `Week ${i + 1}` }));
  const activeWeek = week ?? '0';

  return (
    <>
      <PageHeader
        eyebrow="Workout plan"
        title={plan.title || 'My plan'}
        subtitle={`${weeks.length} week${weeks.length === 1 ? '' : 's'} · ${progress.total} training days`}
        actions={
          <Button to="/app/workouts" variant="secondary" icon="dumbbell">
            Log a workout
          </Button>
        }
      />

      <section className={styles.hero} aria-label="Plan progress">
        <Ring pct={progress.pct} />
        <div className={styles.heroInfo}>
          <p className={styles.heroStat}>
            <strong>{progress.done}</strong> of {progress.total} days completed
          </p>
          {trainer && (
            <p className={styles.trainer}>
              <Avatar src={trainer.avatarUrl} name={trainer.name} size={28} />
              <span>
                Built by <strong>{trainer.name}</strong>
              </span>
            </p>
          )}
          <ul className={styles.weekBars}>
            {progress.perWeek.map((w, i) => (
              <li key={i}>
                <ProgressBar
                  value={w.done}
                  max={w.total || 1}
                  size="sm"
                  label={`Week ${i + 1} · ${w.done}/${w.total}`}
                  tone={w.total && w.done === w.total ? 'success' : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className={styles.tabs}>
        <Tabs tabs={tabs} value={activeWeek} onChange={setWeek} label="Plan weeks" idPrefix={TABS_ID} />
      </div>

      {weeks.map((w, wi) => (
        <TabPanel key={wi} idPrefix={TABS_ID} id={String(wi)} value={activeWeek}>
          {(w.days || []).length === 0 ? (
            <EmptyState compact icon="calendar" title="Rest week" message="No training days scheduled this week." />
          ) : (
            <ul className={styles.days}>
              {w.days.map((day, di) => (
                <li key={day._id || di}>
                  <article className={`${styles.day} ${day.completed ? styles.dayDone : ''}`}>
                    <header className={styles.dayHead}>
                      <div>
                        <p className={styles.dayEyebrow}>Day {di + 1}</p>
                        <h2 className={styles.dayTitle}>{day.name || `Day ${di + 1}`}</h2>
                      </div>
                      {day.completed && (
                        <span className={styles.doneIcon} aria-hidden="true">
                          <Icon name="check" size={18} strokeWidth={2.6} />
                        </span>
                      )}
                    </header>

                    {(day.exercises || []).length === 0 ? (
                      <p className={styles.muted}>No exercises listed.</p>
                    ) : (
                      <ul className={styles.exercises}>
                        {day.exercises.map((ex, ei) => (
                          <li key={ei}>
                            <div className={styles.exRow}>
                              <span className={styles.exName}>{ex.name}</span>
                              <span className={styles.exScheme}>
                                {ex.sets ?? '—'} × {ex.reps ?? '—'}
                              </span>
                            </div>
                            {ex.notes && <p className={styles.exNotes}>{ex.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    )}

                    <footer className={styles.dayFooter}>
                      {day.completed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="refresh"
                          loading={pendingDay === day._id}
                          disabled={Boolean(pendingDay) && pendingDay !== day._id}
                          onClick={() => toggleDay(day._id, false)}
                        >
                          Completed ✓ (undo)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          icon="check"
                          loading={pendingDay === day._id}
                          disabled={Boolean(pendingDay) && pendingDay !== day._id}
                          onClick={() => toggleDay(day._id, true)}
                        >
                          Mark complete
                        </Button>
                      )}
                    </footer>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      ))}
    </>
  );
}

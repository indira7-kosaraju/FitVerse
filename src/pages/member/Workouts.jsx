import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Icon from '../../components/common/Icon';
import { SkeletonCard } from '../../components/common/Skeleton';
import WorkoutForm from '../../components/forms/WorkoutForm';
import useFetch from '../../hooks/useFetch';
import { createWorkout, deleteWorkout, getMyPlan, getMyWorkouts, updateWorkout } from '../../api/workoutApi';
import { getErrorMessage, getFieldErrors, toList } from '../../api/axios';
import { addDays, endOfDay, formatDate, relativeDay, startOfDay, toISODate } from '../../utils/formatDate';
import { formatNumber } from '../../utils/formatCurrency';
import styles from '../../styles/Workouts.module.css';

const PAGE_LIMIT = 10;

const setsOf = (w) => (w.exercises || []).reduce((n, ex) => n + (ex.sets?.length || 0), 0);
const volumeOf = (w) =>
  (w.exercises || []).reduce(
    (sum, ex) =>
      sum + (ex.sets || []).reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weightKg) || 0), 0),
    0
  );

function formatSets(sets = []) {
  return sets
    .map((s) => (Number(s.weightKg) > 0 ? `${s.reps}×${formatNumber(s.weightKg)}kg` : `${s.reps}`))
    .join(', ');
}

function WorkoutCard({ workout, onEdit, onDelete }) {
  const sets = setsOf(workout);
  const volume = volumeOf(workout);
  return (
    <article className={styles.workout}>
      <header className={styles.workoutHead}>
        <div>
          <h3 className={styles.workoutTitle}>
            {(workout.exercises || [])
              .slice(0, 3)
              .map((e) => e.name)
              .join(' · ') || 'Workout'}
            {(workout.exercises?.length || 0) > 3 && ` +${workout.exercises.length - 3}`}
          </h3>
          <ul className={styles.chips}>
            <li>
              <Icon name="layers" size={14} />
              {sets} set{sets === 1 ? '' : 's'}
            </li>
            <li>
              <Icon name="dumbbell" size={14} />
              {formatNumber(Math.round(volume))} kg volume
            </li>
            {workout.durationMin ? (
              <li>
                <Icon name="clock" size={14} />
                {workout.durationMin} min
              </li>
            ) : null}
          </ul>
        </div>
        <div className={styles.workoutActions}>
          <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label="Edit workout" onClick={() => onEdit(workout)} />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="trash"
            aria-label="Delete workout"
            onClick={() => onDelete(workout)}
          />
        </div>
      </header>

      <ul className={styles.exerciseList}>
        {(workout.exercises || []).map((ex, i) => (
          <li key={`${ex.name}-${i}`}>
            <span className={styles.exName}>{ex.name}</span>
            <span className={styles.exSets}>{formatSets(ex.sets)}</span>
          </li>
        ))}
      </ul>

      {workout.notes && <p className={styles.notes}>{workout.notes}</p>}
    </article>
  );
}

export default function Workouts() {
  const [range, setRange] = useState(() => ({
    from: toISODate(addDays(new Date(), -30)),
    to: toISODate(new Date()),
  }));
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const rangeError = range.from && range.to && range.from > range.to ? 'Start must be before end' : '';
  const params = useMemo(
    () => ({
      from: range.from ? startOfDay(new Date(`${range.from}T00:00:00`)).toISOString() : undefined,
      to: range.to ? endOfDay(new Date(`${range.to}T00:00:00`)).toISOString() : undefined,
    }),
    [range.from, range.to]
  );
  const paramsKey = `${params.from}|${params.to}`;

  const list = useFetch(
    () =>
      rangeError
        ? Promise.resolve({ data: [], total: 0, page: 1, pages: 1 })
        : getMyWorkouts({ ...params, page: 1, limit: PAGE_LIMIT, sort: '-date' }),
    [paramsKey, reloadKey]
  );

  const summary = useFetch(
    () => (rangeError ? Promise.resolve({ data: [] }) : getMyWorkouts({ ...params, limit: 500 })),
    [paramsKey, reloadKey]
  );

  const plan = useFetch(() => getMyPlan().catch(() => null), []);

  const planDays = useMemo(() => {
    const weeks = plan.data?.weeks || [];
    return weeks.flatMap((week, w) =>
      (week.days || []).map((day, d) => ({
        id: day._id || `${w}-${d}`,
        label: `Week ${w + 1} · ${day.name || `Day ${d + 1}`}`,
        exercises: day.exercises || [],
      }))
    );
  }, [plan.data]);

  const stats = useMemo(() => {
    const items = toList(summary.data);
    const count = summary.data?.total ?? items.length;
    const volume = items.reduce((s, w) => s + volumeOf(w), 0);
    const withDuration = items.filter((w) => Number(w.durationMin) > 0);
    const avg = withDuration.length
      ? withDuration.reduce((s, w) => s + Number(w.durationMin), 0) / withDuration.length
      : null;
    return { count, volume, avg };
  }, [summary.data]);

  const workouts = toList(list.data);
  const groups = useMemo(() => {
    const map = new Map();
    workouts.forEach((w) => {
      const key = toISODate(w.date);
      if (!map.has(key)) map.set(key, { key, date: w.date, items: [] });
      map.get(key).items.push(w);
    });
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [workouts]);

  const hasMore = (list.data?.page || 1) < (list.data?.pages || 1);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await getMyWorkouts({ ...params, page: (list.data?.page || 1) + 1, limit: PAGE_LIMIT, sort: '-date' });
      list.setData((prev) => {
        const seen = new Set(toList(prev).map((w) => w._id));
        return { ...next, data: [...toList(prev), ...toList(next).filter((w) => !seen.has(w._id))] };
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setServerErrors({});
    setFormOpen(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setServerErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerErrors({});
    try {
      if (editing) {
        await updateWorkout(editing._id, payload);
        toast.success('Workout updated');
      } else {
        await createWorkout(payload);
        toast.success('Workout logged. Nice work!');
      }
      setFormOpen(false);
      setEditing(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteWorkout(toDelete._id);
      toast.success('Workout deleted');
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  let content;
  if (list.loading)
    content = (
      <div role="status" aria-live="polite" className={styles.groups}>
        <span className="sr-only">Loading workouts…</span>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    );
  else if (list.error) content = <ErrorState message={list.error} onRetry={list.refetch} />;
  else if (workouts.length === 0)
    content = (
      <EmptyState
        icon="dumbbell"
        title="No workouts in this range"
        message="Log a session to start building your training history."
        action={
          <Button icon="plus" onClick={openCreate}>
            Log workout
          </Button>
        }
      />
    );
  else
    content = (
      <div className={styles.groups}>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`wk-${g.key}`} className={styles.group}>
            <h2 id={`wk-${g.key}`} className={styles.groupHead}>
              {relativeDay(g.date)}
              <span className={styles.groupDate}>{formatDate(g.date)}</span>
            </h2>
            <ul className={styles.cardList}>
              {g.items.map((w) => (
                <li key={w._id}>
                  <WorkoutCard workout={w} onEdit={openEdit} onDelete={setToDelete} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {hasMore && (
          <div className={styles.more}>
            <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
            <p className={styles.moreHint}>
              Showing {workouts.length} of {list.data?.total ?? workouts.length}
            </p>
          </div>
        )}
      </div>
    );

  return (
    <>
      <PageHeader
        title="Workouts"
        subtitle="Log your sessions and watch the volume stack up."
        actions={
          <Button icon="plus" onClick={openCreate}>
            Log workout
          </Button>
        }
      />

      <div className={styles.stats}>
        <StatCard label="Workouts" value={formatNumber(stats.count)} icon="dumbbell" loading={summary.loading} hint="in selected range" />
        <StatCard
          label="Total volume"
          value={`${formatNumber(Math.round(stats.volume))} kg`}
          icon="bolt"
          tone="accent"
          loading={summary.loading}
          hint="reps × weight"
        />
        <StatCard
          label="Avg duration"
          value={stats.avg ? `${Math.round(stats.avg)} min` : '—'}
          icon="clock"
          tone="info"
          loading={summary.loading}
          hint="per session"
        />
      </div>
      {summary.error && !summary.loading && (
        <div className={styles.summaryError}>
          <ErrorState compact title="Couldn't load summary" message={summary.error} onRetry={summary.refetch} />
        </div>
      )}

      <form className={styles.filters} aria-label="Date range" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="From"
          type="date"
          value={range.from}
          max={range.to || undefined}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          error={rangeError}
        />
        <Input
          label="To"
          type="date"
          value={range.to}
          min={range.from || undefined}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
        />
        <Button
          variant="ghost"
          size="sm"
          icon="refresh"
          className={styles.resetBtn}
          onClick={() => setRange({ from: toISODate(addDays(new Date(), -30)), to: toISODate(new Date()) })}
        >
          Last 30 days
        </Button>
      </form>

      {content}

      <Modal
        open={formOpen}
        onClose={closeForm}
        size="lg"
        title={editing ? 'Edit workout' : 'Log workout'}
        description={editing ? formatDate(editing.date) : 'Record exercises, sets, reps and weight.'}
        closeOnBackdrop={false}
      >
        <WorkoutForm
          key={editing?._id || 'new'}
          initialValues={editing || undefined}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={saving}
          serverErrors={serverErrors}
          planDays={planDays}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete workout?"
        message={toDelete ? `This removes your ${formatDate(toDelete.date)} workout permanently.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

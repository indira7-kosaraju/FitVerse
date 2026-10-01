import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Icon from '../../components/common/Icon';
import Skeleton from '../../components/common/Skeleton';
import { classTypeLabel } from '../../components/common/ClassCard';
import ClassForm, { buildOccurrences } from '../../components/forms/ClassForm';
import useFetch from '../../hooks/useFetch';
import { getClasses, createClass, updateClass, deleteClass } from '../../api/classApi';
import { getUsers } from '../../api/adminApi';
import { getErrorMessage, getFieldErrors, toList } from '../../api/axios';
import { CLASS_TYPES } from '../../utils/constants';
import {
  addDays,
  endOfDay,
  formatDate,
  formatTime,
  formatTimeRange,
  isSameDay,
  startOfWeek,
} from '../../utils/formatDate';
import styles from '../../styles/ManageClasses.module.css';

const TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...CLASS_TYPES];

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

function weekLabel(start) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const left = formatDate(start, { month: 'short', day: 'numeric' });
  const right = formatDate(end, sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  return `${left} – ${right}`;
}

export default function ManageClasses() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState('calendar');
  const [type, setType] = useState('');
  const [trainer, setTrainer] = useState('');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [serverErrors, setServerErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const from = weekStart.toISOString();
  const to = endOfDay(addDays(weekStart, 6)).toISOString();

  const {
    data: classData,
    loading,
    error,
    refetch,
    setData,
  } = useFetch(() => getClasses({ from, to, type, trainer, limit: 300 }), [from, to, type, trainer]);

  const {
    data: trainerData,
    error: trainerError,
    refetch: refetchTrainers,
  } = useFetch(() => getUsers({ role: 'trainer', limit: 200 }), []);

  const trainerOptions = useMemo(
    () =>
      toList(trainerData)
        .map((u) => ({ value: u._id, label: u.name || u.email || 'Unnamed trainer' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [trainerData]
  );

  const trainerName = (ref) => {
    if (ref && typeof ref === 'object' && ref.name) return ref.name;
    const id = idOf(ref);
    return trainerOptions.find((t) => t.value === id)?.label || 'Unassigned';
  };

  const classes = useMemo(
    () => [...toList(classData)].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [classData]
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return { date, items: classes.filter((c) => c.startTime && isSameDay(c.startTime, date)) };
      }),
    [weekStart, classes]
  );

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date()));
  const today = new Date();

  /* ---------- Create ---------- */
  const openCreate = () => {
    setServerErrors({});
    setProgress(null);
    setCreating(true);
  };

  const handleCreate = async (payload) => {
    const occurrences = buildOccurrences(payload);
    if (!occurrences.length) {
      toast.error('No class dates match the selected repeat options.');
      return;
    }
    setSaving(true);
    setServerErrors({});
    setProgress({ done: 0, total: occurrences.length });
    let ok = 0;
    let firstError = null;
    for (let i = 0; i < occurrences.length; i += 1) {
      try {
        // Sequential on purpose: keeps the backend happy and progress accurate.
        // eslint-disable-next-line no-await-in-loop
        await createClass(occurrences[i]);
        ok += 1;
      } catch (err) {
        if (!firstError) firstError = err;
      }
      setProgress({ done: i + 1, total: occurrences.length });
    }
    const failed = occurrences.length - ok;
    setSaving(false);
    setProgress(null);

    if (failed === 0) {
      toast.success(ok === 1 ? `${payload.title} scheduled` : `${ok} classes scheduled`);
      setCreating(false);
    } else if (ok === 0) {
      if (occurrences.length === 1) setServerErrors(getFieldErrors(firstError));
      toast.error(
        occurrences.length === 1
          ? getErrorMessage(firstError)
          : `All ${failed} classes failed: ${getErrorMessage(firstError)}`
      );
    } else {
      toast.error(`${ok} of ${occurrences.length} scheduled, ${failed} failed: ${getErrorMessage(firstError)}`);
      setCreating(false);
    }
    if (ok > 0) refetch();
  };

  /* ---------- Edit ---------- */
  const openEdit = (gymClass) => {
    setServerErrors({});
    setEditing(gymClass);
  };

  const handleUpdate = async (payload) => {
    if (!editing) return;
    // eslint-disable-next-line no-unused-vars
    const { recurrence, ...data } = payload;
    setSaving(true);
    setServerErrors({});
    try {
      await updateClass(editing._id, data);
      toast.success(`${data.title} updated`);
      setEditing(null);
      refetch();
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Delete ---------- */
  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteClass(toDelete._id);
      setData((d) => ({ ...(d || {}), data: toList(d).filter((c) => c._id !== toDelete._id) }));
      toast.success(`${toDelete.title} deleted`);
      if (editing?._id === toDelete._id) setEditing(null);
      setToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Render helpers ---------- */
  const typeClass = (t) => styles[`type-${t}`] || '';

  const columns = [
    {
      key: 'title',
      header: 'Class',
      render: (c) => (
        <span className={styles.cellTitle}>
          <span className={`${styles.swatch} ${typeClass(c.type)}`} aria-hidden="true" />
          {c.title}
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (c) => classTypeLabel(c.type), hideOnMobile: true },
    { key: 'trainer', header: 'Trainer', render: (c) => trainerName(c.trainer), hideOnMobile: true },
    {
      key: 'startTime',
      header: 'Date & time',
      render: (c) => (
        <span className={styles.cellDate}>
          <span>{formatDate(c.startTime, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className={styles.muted}>{formatTimeRange(c.startTime, c.endTime)}</span>
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'Booked',
      align: 'right',
      render: (c) => {
        const booked = Number(c.bookedCount) || 0;
        const cap = Number(c.capacity) || 0;
        return (
          <Badge tone={cap && booked >= cap ? 'warning' : 'neutral'}>
            {booked}/{cap}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (c) => (
        <span className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit ${c.title}`} onClick={() => openEdit(c)} />
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            icon="trash"
            aria-label={`Delete ${c.title}`}
            onClick={() => setToDelete(c)}
          />
        </span>
      ),
    },
  ];

  let body;
  if (error) {
    body = <ErrorState message={error} onRetry={refetch} />;
  } else if (loading && !classData) {
    body =
      view === 'calendar' ? (
        <div className={styles.calendar} role="status" aria-label="Loading classes">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={styles.day}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={56} count={2} />
            </div>
          ))}
        </div>
      ) : (
        <Table columns={columns} data={[]} loading />
      );
  } else if (!classes.length) {
    body = (
      <EmptyState
        icon="calendar"
        title="No classes this week"
        message={type || trainer ? 'Try clearing the filters or pick another week.' : 'Schedule a class to fill the timetable.'}
        action={
          <Button icon="plus" onClick={openCreate}>
            New class
          </Button>
        }
      />
    );
  } else if (view === 'list') {
    body = (
      <Table
        columns={columns}
        data={classes}
        onRowClick={openEdit}
        loading={loading}
        caption={`Classes for ${weekLabel(weekStart)}`}
      />
    );
  } else {
    body = (
      <div className={`${styles.calendar} ${loading ? styles.refreshing : ''}`} aria-busy={loading || undefined}>
        {days.map(({ date, items }) => {
          const isToday = isSameDay(date, today);
          return (
            <section
              key={date.toISOString()}
              className={`${styles.day} ${isToday ? styles.today : ''}`}
              aria-labelledby={`day-${date.getDay()}`}
            >
              <h2 id={`day-${date.getDay()}`} className={styles.dayHead}>
                <span className={styles.dayName}>{formatDate(date, { weekday: 'short' })}</span>
                <span className={styles.dayNum}>{date.getDate()}</span>
                {isToday && <span className="sr-only">(today)</span>}
                <span className={styles.dayCount}>{items.length ? `${items.length}` : ''}</span>
              </h2>
              {items.length ? (
                <ul className={styles.items}>
                  {items.map((c) => {
                    const booked = Number(c.bookedCount) || 0;
                    const cap = Number(c.capacity) || 0;
                    const full = cap > 0 && booked >= cap;
                    return (
                      <li key={c._id}>
                        <button
                          type="button"
                          className={`${styles.item} ${typeClass(c.type)}`}
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.title}, ${formatTimeRange(c.startTime, c.endTime)}, ${trainerName(
                            c.trainer
                          )}, ${booked} of ${cap} booked`}
                        >
                          <span className={styles.itemTime}>{formatTime(c.startTime)}</span>
                          <span className={styles.itemTitle}>{c.title}</span>
                          <span className={styles.itemMeta}>
                            <span className={styles.itemTrainer}>{trainerName(c.trainer)}</span>
                            <span className={`${styles.itemCap} ${full ? styles.full : ''}`}>
                              <Icon name="users" size={12} />
                              {booked}/{cap}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.noClasses}>No classes</p>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Admin"
        title="Classes"
        subtitle="Plan the weekly timetable, assign trainers and manage capacity."
        actions={
          <Button icon="plus" onClick={openCreate}>
            New class
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.weekNav}>
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
            disabled={isThisWeek}
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            This week
          </Button>
        </div>

        <div className={styles.filters}>
          <Select
            label="Type"
            hideLabel
            options={TYPE_OPTIONS}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <Select
            label="Trainer"
            hideLabel
            options={[{ value: '', label: 'All trainers' }, ...trainerOptions]}
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
          />
          <div className={styles.viewToggle} role="group" aria-label="View">
            <button
              type="button"
              className={`${styles.viewBtn} ${view === 'calendar' ? styles.viewActive : ''}`}
              aria-pressed={view === 'calendar'}
              onClick={() => setView('calendar')}
            >
              <Icon name="calendar" size={16} />
              <span>Week</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${view === 'list' ? styles.viewActive : ''}`}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <Icon name="list" size={16} />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {trainerError && (
        <p className={styles.notice} role="alert">
          <Icon name="alert" size={16} />
          Couldn&apos;t load trainers: {trainerError}
          <Button variant="ghost" size="sm" icon="refresh" onClick={refetchTrainers}>
            Retry
          </Button>
        </p>
      )}

      {body}

      <Modal
        open={creating}
        onClose={saving ? undefined : () => setCreating(false)}
        closeOnBackdrop={!saving}
        title="New class"
        description="Schedule a single class or repeat it weekly."
        size="lg"
      >
        {progress && (
          <div className={styles.progress} role="status" aria-live="polite">
            <span>
              Creating class {Math.min(progress.done + 1, progress.total)} of {progress.total}…
            </span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </span>
          </div>
        )}
        {creating && (
          <ClassForm
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitting={saving}
            serverErrors={serverErrors}
            trainerOptions={trainerOptions}
            allowRecurring
          />
        )}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={saving ? undefined : () => setEditing(null)}
        closeOnBackdrop={!saving}
        title={editing ? `Edit ${editing.title}` : 'Edit class'}
        description={editing ? formatDate(editing.startTime, { weekday: 'long', month: 'long', day: 'numeric' }) : undefined}
        size="lg"
        footer={
          editing ? (
            <div className={styles.dangerZone}>
              <span className={styles.muted}>
                {Number(editing.bookedCount) || 0} member{Number(editing.bookedCount) === 1 ? '' : 's'} booked
              </span>
              <Button variant="danger" size="sm" icon="trash" disabled={saving} onClick={() => setToDelete(editing)}>
                Delete class
              </Button>
            </div>
          ) : null
        }
      >
        {editing && (
          <ClassForm
            key={editing._id}
            initialValues={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitting={saving}
            serverErrors={serverErrors}
            trainerOptions={trainerOptions}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Delete ${toDelete?.title || 'class'}?`}
        message={
          Number(toDelete?.bookedCount) > 0
            ? `${toDelete.bookedCount} member(s) are booked into this class. Their bookings will be cancelled.`
            : 'This class will be removed from the timetable.'
        }
        confirmLabel="Delete class"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}

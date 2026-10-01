import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import ClassCard from '../../components/common/ClassCard';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProgressBar from '../../components/common/ProgressBar';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import ClassForm, { buildOccurrences } from '../../components/forms/ClassForm';
import RosterModal from '../../components/trainer/RosterModal';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { getClasses, createClass, updateClass, deleteClass } from '../../api/classApi';
import { getErrorMessage, getFieldErrors, toList } from '../../api/axios';
import { addDays } from '../../utils/formatDate';
import styles from '../../styles/MyClasses.module.css';

const TAB_IDS = { upcoming: 'upcoming', past: 'past' };

export default function MyClasses() {
  const { user } = useAuth();
  const trainerId = user?._id;
  const [tab, setTab] = useState(TAB_IDS.upcoming);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);
  const [progress, setProgress] = useState(null);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rosterClass, setRosterClass] = useState(null);

  const { data, loading, error, refetch, setData } = useFetch(() => {
    const now = new Date();
    const from = tab === TAB_IDS.upcoming ? now : addDays(now, -60);
    const to = tab === TAB_IDS.upcoming ? addDays(now, 60) : now;
    return getClasses({ trainer: trainerId, from: from.toISOString(), to: to.toISOString(), limit: 200 });
  }, [tab, trainerId]);

  const classes = useMemo(() => {
    const list = toList(data).slice();
    list.sort((a, b) =>
      tab === TAB_IDS.upcoming
        ? new Date(a.startTime) - new Date(b.startTime)
        : new Date(b.startTime) - new Date(a.startTime)
    );
    return list;
  }, [data, tab]);

  const openCreate = () => {
    setEditing(null);
    setServerErrors(null);
    setProgress(null);
    setFormOpen(true);
  };

  const openEdit = (gymClass) => {
    setEditing(gymClass);
    setServerErrors(null);
    setProgress(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditing(null);
    setProgress(null);
  };

  const handleCreate = async (payload) => {
    const occurrences = buildOccurrences(payload).map((p) => ({ ...p, trainer: trainerId }));
    const total = occurrences.length;
    let created = 0;
    const failures = [];
    setSubmitting(true);
    setServerErrors(null);
    setProgress(total > 1 ? { done: 0, total } : null);

    for (let i = 0; i < total; i += 1) {
      try {
        // Sequential on purpose: keeps server load predictable and progress accurate.
        // eslint-disable-next-line no-await-in-loop
        await createClass(occurrences[i]);
        created += 1;
      } catch (err) {
        failures.push(err);
      }
      if (total > 1) setProgress({ done: i + 1, total });
    }

    setSubmitting(false);
    setProgress(null);

    if (failures.length === 0) {
      toast.success(total === 1 ? 'Class created' : `Created ${created} classes`);
      setFormOpen(false);
      refetch();
      return;
    }
    if (created === 0) {
      toast.error(getErrorMessage(failures[0]));
      setServerErrors(getFieldErrors(failures[0]));
      return;
    }
    toast.error(`Created ${created} of ${total} classes. ${failures.length} failed: ${getErrorMessage(failures[0])}`);
    setFormOpen(false);
    refetch();
  };

  const handleUpdate = async (payload) => {
    const [body] = buildOccurrences({ ...payload, recurrence: null });
    setSubmitting(true);
    setServerErrors(null);
    try {
      const updated = await updateClass(editing._id, body);
      toast.success('Class updated');
      setData((prev) => {
        const list = toList(prev).map((c) => {
          if (c._id !== editing._id) return c;
          const merged = { ...c, ...body, ...(updated && typeof updated === 'object' ? updated : {}) };
          if (typeof merged.trainer !== 'object') merged.trainer = c.trainer;
          return merged;
        });
        return Array.isArray(prev) ? list : { ...(prev || {}), data: list };
      });
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setServerErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteClass(toDelete._id);
      toast.success('Class deleted');
      setData((prev) => {
        const list = toList(prev).filter((c) => c._id !== toDelete._id);
        return Array.isArray(prev)
          ? list
          : { ...(prev || {}), data: list, total: Math.max(0, (prev?.total ?? list.length + 1) - 1) };
      });
      setToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const renderActions = (c) => (
    <div className={styles.actions}>
      <Button size="sm" variant="outline" icon="clipboard" onClick={() => setRosterClass(c)}>
        Roster
      </Button>
      <span className={styles.iconActions}>
        <Button
          size="sm"
          variant="ghost"
          icon="edit"
          iconOnly
          aria-label={`Edit ${c.title}`}
          onClick={() => openEdit(c)}
        />
        <Button
          size="sm"
          variant="ghost"
          icon="trash"
          iconOnly
          aria-label={`Delete ${c.title}`}
          onClick={() => setToDelete(c)}
        />
      </span>
    </div>
  );

  const bookedOnDelete = Number(toDelete?.bookedCount) || 0;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Schedule"
        title="My classes"
        subtitle="Plan sessions, manage rosters and keep your timetable sharp."
        actions={
          <Button icon="plus" onClick={openCreate}>
            New class
          </Button>
        }
      />

      <Tabs
        label="Class range"
        idPrefix="my-classes"
        tabs={[
          { id: TAB_IDS.upcoming, label: 'Upcoming', count: tab === TAB_IDS.upcoming && !loading ? classes.length : undefined },
          { id: TAB_IDS.past, label: 'Past', count: tab === TAB_IDS.past && !loading ? classes.length : undefined },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div role="tabpanel" id={`my-classes-panel-${tab}`} aria-labelledby={`my-classes-tab-${tab}`} className={styles.panel}>
        {loading ? (
          <SkeletonGrid count={6} minWidth={260} label="Loading classes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : classes.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={tab === TAB_IDS.upcoming ? 'No upcoming classes' : 'No past classes'}
            message={
              tab === TAB_IDS.upcoming
                ? 'Your next 60 days are wide open. Schedule a class to get members moving.'
                : 'Classes from the last 60 days will show up here.'
            }
            action={
              tab === TAB_IDS.upcoming ? (
                <Button icon="plus" onClick={openCreate}>
                  New class
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.grid}>
            {classes.map((c) => (
              <ClassCard key={c._id} gymClass={c} actions={renderActions(c)} />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={closeForm}
        size="lg"
        closeOnBackdrop={!submitting}
        title={editing ? 'Edit class' : 'New class'}
        description={editing ? 'Update the details — booked members keep their spots.' : 'Create a one-off or weekly recurring class.'}
      >
        {progress && (
          <div className={styles.progress} role="status" aria-live="polite">
            <ProgressBar
              value={progress.done}
              max={progress.total}
              label={`Creating ${Math.min(progress.done + 1, progress.total)}/${progress.total}…`}
              showValue
            />
          </div>
        )}
        <ClassForm
          key={editing?._id || 'new'}
          initialValues={editing || undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeForm}
          submitting={submitting}
          serverErrors={serverErrors}
          allowRecurring
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this class?"
        message={
          toDelete
            ? bookedOnDelete > 0
              ? `"${toDelete.title}" has ${bookedOnDelete} booked member${bookedOnDelete === 1 ? '' : 's'}. Deleting it will cancel their bookings. This can't be undone.`
              : `"${toDelete.title}" will be removed from the schedule. This can't be undone.`
            : ''
        }
        confirmLabel="Delete class"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <RosterModal gymClass={rosterClass} open={Boolean(rosterClass)} onClose={() => setRosterClass(null)} />
    </div>
  );
}

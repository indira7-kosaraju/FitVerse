import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Toggle from '../../components/common/Toggle';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Icon from '../../components/common/Icon';
import { SkeletonGrid } from '../../components/common/Skeleton';
import PlanForm from '../../components/forms/PlanForm';
import useFetch from '../../hooks/useFetch';
import { getPlans, createPlan, updatePlan, deletePlan } from '../../api/membershipApi';
import { getErrorMessage, getFieldErrors, toList } from '../../api/axios';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from '../../styles/Plans.module.css';

export function formatDuration(days) {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return '—';
  if (d % 365 === 0) return d === 365 ? '1 year' : `${d / 365} years`;
  if (d === 1) return '1 day';
  return `${d} days`;
}

const perMonth = (plan) => {
  const d = Number(plan.durationDays);
  const p = Number(plan.price);
  if (!d || !Number.isFinite(p) || d <= 31) return null;
  return p / (d / 30);
};

export default function Plans() {
  const { data, loading, error, refetch, setData } = useFetch(() => getPlans({ limit: 100 }), []);
  const plans = toList(data);

  const [editor, setEditor] = useState(null); // { plan?: Plan } when open
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState({});

  const replacePlan = (id, next) =>
    setData((d) => ({ ...(d || {}), data: toList(d).map((p) => (p._id === id ? next : p)) }));

  const openEditor = (plan) => {
    setServerErrors({});
    setEditor({ plan });
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerErrors({});
    const existing = editor?.plan;
    try {
      if (existing?._id) {
        const updated = await updatePlan(existing._id, payload);
        replacePlan(existing._id, { ...existing, ...payload, ...(updated && typeof updated === 'object' ? updated : {}) });
        toast.success(`${payload.name} updated`);
      } else {
        const created = await createPlan(payload);
        if (created?._id) {
          setData((d) => ({ ...(d || {}), data: [...toList(d), created], total: (d?.total ?? 0) + 1 }));
        } else {
          refetch();
        }
        toast.success(`${payload.name} created`);
      }
      setEditor(null);
    } catch (err) {
      setServerErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan, active) => {
    const previous = plan;
    const { _id, name } = plan;
    replacePlan(_id, { ...plan, active });
    setToggling((t) => ({ ...t, [_id]: true }));
    try {
      await updatePlan(_id, { ...plan, active });
      toast.success(`${name} is now ${active ? 'active' : 'inactive'}`);
    } catch (err) {
      replacePlan(_id, previous);
      toast.error(getErrorMessage(err));
    } finally {
      setToggling((t) => ({ ...t, [_id]: false }));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePlan(toDelete._id);
      setData((d) => ({
        ...(d || {}),
        data: toList(d).filter((p) => p._id !== toDelete._id),
        total: Math.max(0, (d?.total ?? 1) - 1),
      }));
      toast.success(`${toDelete.name} deleted`);
      setToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const sorted = [...plans].sort(
    (a, b) => Number(b.active !== false) - Number(a.active !== false) || Number(a.price) - Number(b.price)
  );

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={3} lines={5} minWidth={280} label="Loading plans…" />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={refetch} />;
  } else if (!plans.length) {
    content = (
      <EmptyState
        icon="layers"
        title="No plans yet"
        message="Create your first membership plan so members can subscribe."
        action={
          <Button icon="plus" onClick={() => openEditor()}>
            New plan
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className={styles.grid}>
        {sorted.map((plan) => {
          const active = plan.active !== false;
          const monthly = perMonth(plan);
          const features = Array.isArray(plan.features) ? plan.features : [];
          return (
            <li key={plan._id}>
              <article className={`${styles.card} ${active ? '' : styles.inactive}`} aria-label={plan.name}>
                <header className={styles.cardHead}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.name}>{plan.name}</h2>
                    {!active && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <p className={styles.price}>
                    <span className={styles.amount}>{formatCurrency(plan.price)}</span>
                    <span className={styles.duration}>/ {formatDuration(plan.durationDays)}</span>
                  </p>
                  {monthly !== null && <p className={styles.perMonth}>≈ {formatCurrency(monthly)} per month</p>}
                </header>

                {features.length > 0 ? (
                  <ul className={styles.features}>
                    {features.map((f, i) => (
                      <li key={`${f}-${i}`}>
                        <Icon name="check" size={16} className={styles.check} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.noFeatures}>No features listed.</p>
                )}

                <footer className={styles.cardFoot}>
                  <Toggle
                    checked={active}
                    onChange={(v) => handleToggle(plan, v)}
                    label="Active"
                    disabled={Boolean(toggling[plan._id])}
                  />
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon="edit"
                      aria-label={`Edit ${plan.name}`}
                      onClick={() => openEditor(plan)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon="trash"
                      aria-label={`Delete ${plan.name}`}
                      onClick={() => setToDelete(plan)}
                    />
                  </div>
                </footer>
              </article>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Admin"
        title="Membership plans"
        subtitle="Pricing, durations and perks members can subscribe to."
        actions={
          <Button icon="plus" onClick={() => openEditor()}>
            New plan
          </Button>
        }
      />

      {content}

      <Modal
        open={Boolean(editor)}
        onClose={closeEditor}
        title={editor?.plan?._id ? `Edit ${editor.plan.name}` : 'New plan'}
        description={editor?.plan?._id ? 'Changes apply to new subscriptions.' : 'Define price, duration and features.'}
        size="md"
      >
        {editor && (
          <PlanForm
            key={editor.plan?._id || 'new'}
            initialValues={editor.plan}
            onSubmit={handleSubmit}
            onCancel={closeEditor}
            submitting={saving}
            serverErrors={serverErrors}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title={`Delete ${toDelete?.name || 'plan'}?`}
        message="This permanently removes the plan. Consider deactivating it instead to keep it for existing members."
        confirmLabel="Delete plan"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}

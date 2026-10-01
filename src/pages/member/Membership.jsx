import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Icon from '../../components/common/Icon';
import Pagination from '../../components/common/Pagination';
import ProgressBar from '../../components/common/ProgressBar';
import Skeleton, { SkeletonGrid } from '../../components/common/Skeleton';
import Table from '../../components/common/Table';
import useFetch from '../../hooks/useFetch';
import { cancelMembership, getMyMembership, getMyPayments, getPlans, subscribe } from '../../api/membershipApi';
import { getErrorMessage, toList } from '../../api/axios';
import { daysBetween, daysLeft, formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from '../../styles/Membership.module.css';

const PAYMENTS_LIMIT = 10;
const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref);

const durationLabel = (days) => {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return '—';
  if (d % 365 === 0) return `${d / 365} year${d / 365 > 1 ? 's' : ''}`;
  if (d % 30 === 0) return `${d / 30} month${d / 30 > 1 ? 's' : ''}`;
  if (d % 7 === 0) return `${d / 7} week${d / 7 > 1 ? 's' : ''}`;
  return `${d} days`;
};

export default function Membership() {
  const membershipQuery = useFetch(() => getMyMembership(), []);
  const plansQuery = useFetch(() => getPlans(), []);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsQuery = useFetch(
    () => getMyPayments({ page: paymentsPage, limit: PAYMENTS_LIMIT, sort: '-createdAt' }),
    [paymentsPage]
  );

  const plans = useMemo(() => toList(plansQuery.data).filter((p) => p && p.active !== false), [plansQuery.data]);

  const membership = membershipQuery.data;
  const plan = useMemo(() => {
    if (!membership) return null;
    if (membership.plan && typeof membership.plan === 'object') return membership.plan;
    return plans.find((p) => p._id === membership.plan) || null;
  }, [membership, plans]);

  const currentPlanId = membership && ['active', 'frozen'].includes(membership.status) ? idOf(membership.plan) : null;

  /* ---------- Cancel ---------- */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await cancelMembership(membership._id);
      toast.success('Membership cancelled');
      setCancelOpen(false);
      if (updated && typeof updated === 'object' && updated._id) {
        membershipQuery.setData((prev) => ({ ...prev, ...updated, plan: updated.plan && typeof updated.plan === 'object' ? updated.plan : prev?.plan }));
      }
      membershipQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  /* ---------- Subscribe ---------- */
  const [chosenPlan, setChosenPlan] = useState(null);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!chosenPlan) return;
    setSubscribing(true);
    try {
      await subscribe(chosenPlan._id);
      toast.success(`You're now on ${chosenPlan.name}`);
      setChosenPlan(null);
      membershipQuery.refetch();
      if (paymentsPage === 1) paymentsQuery.refetch();
      else setPaymentsPage(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubscribing(false);
    }
  };

  /* ---------- Membership card ---------- */
  const renderMembership = () => {
    if (membershipQuery.loading) {
      return (
        <div className={styles.currentSkeleton} role="status" aria-live="polite">
          <span className="sr-only">Loading membership…</span>
          <Skeleton height={28} width="40%" />
          <Skeleton height={16} count={3} />
          <Skeleton height={10} />
        </div>
      );
    }
    if (membershipQuery.error) {
      return <ErrorState message={membershipQuery.error} onRetry={membershipQuery.refetch} />;
    }
    if (!membership) {
      return (
        <EmptyState
          icon="card"
          title="No active membership"
          message="Pick a plan below to unlock classes, trainers and progress tracking."
        />
      );
    }

    const total = Math.max(1, daysBetween(membership.startDate, membership.endDate));
    const left = daysLeft(membership.endDate);
    const isLive = membership.status === 'active' || membership.status === 'frozen';
    const features = Array.isArray(plan?.features) ? plan.features : [];

    return (
      <article className={styles.current}>
        <div className={styles.currentHead}>
          <div>
            <p className={styles.eyebrow}>Your plan</p>
            <h2 className={styles.planName}>{plan?.name || 'Membership'}</h2>
            {plan && (
              <p className={styles.planPrice}>
                <strong>{formatCurrency(plan.price)}</strong>
                <span> / {durationLabel(plan.durationDays)}</span>
              </p>
            )}
          </div>
          <Badge status={membership.status} dot />
        </div>

        <dl className={styles.dates}>
          <div>
            <dt>Started</dt>
            <dd>{formatDate(membership.startDate)}</dd>
          </div>
          <div>
            <dt>{membership.status === 'expired' || membership.status === 'cancelled' ? 'Ended' : 'Renews / ends'}</dt>
            <dd>{formatDate(membership.endDate)}</dd>
          </div>
          <div>
            <dt>Days left</dt>
            <dd className={styles.daysLeft}>{isLive ? left : 0}</dd>
          </div>
        </dl>

        {isLive && (
          <ProgressBar
            value={left}
            max={total}
            label={`${left} of ${total} days remaining`}
            tone={left / total <= 0.1 ? 'warning' : undefined}
          />
        )}

        {membership.status === 'frozen' && (
          <p className={styles.notice}>
            <Icon name="snowflake" size={16} /> Your membership is frozen. Contact the front desk to reactivate it.
          </p>
        )}

        {features.length > 0 && (
          <ul className={styles.features}>
            {features.map((f) => (
              <li key={f}>
                <Icon name="checkCircle" size={16} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        {isLive && (
          <div className={styles.currentActions}>
            <Button variant="danger" icon="close" onClick={() => setCancelOpen(true)}>
              Cancel membership
            </Button>
          </div>
        )}
      </article>
    );
  };

  /* ---------- Payments ---------- */
  const paymentColumns = [
    { key: 'createdAt', header: 'Date', render: (p) => formatDate(p.createdAt) },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <strong>{formatCurrency(p.amount)}</strong> },
    { key: 'status', header: 'Status', render: (p) => <Badge status={p.status} size="sm" /> },
    {
      key: 'invoice',
      header: 'Invoice',
      align: 'right',
      render: (p) =>
        p.invoiceUrl ? (
          <a
            className={styles.invoiceLink}
            href={p.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open invoice from ${formatDate(p.createdAt)} in a new tab`}
          >
            <Icon name="download" size={15} /> Invoice
          </a>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Billing"
        title="Membership"
        subtitle="Manage your plan, switch tiers and download invoices."
      />

      <section aria-label="Current membership">{renderMembership()}</section>

      <section className={styles.section} aria-labelledby="plans-heading">
        <div className={styles.sectionHead}>
          <h2 id="plans-heading" className={styles.sectionTitle}>
            {currentPlanId ? 'Change plan' : 'Choose a plan'}
          </h2>
          <p className={styles.muted}>Switching takes effect immediately and starts a new billing period.</p>
        </div>

        {plansQuery.error ? (
          <ErrorState message={plansQuery.error} onRetry={plansQuery.refetch} />
        ) : plansQuery.loading ? (
          <SkeletonGrid count={3} lines={5} label="Loading plans…" />
        ) : plans.length === 0 ? (
          <EmptyState icon="layers" title="No plans available" message="Check back soon — new plans are on the way." />
        ) : (
          <ul className={styles.plans}>
            {plans.map((p) => {
              const isCurrent = p._id === currentPlanId;
              return (
                <li key={p._id}>
                  <article className={`${styles.plan} ${isCurrent ? styles.planCurrent : ''}`}>
                    <header className={styles.planHead}>
                      <h3 className={styles.planTitle}>{p.name}</h3>
                      {isCurrent && (
                        <Badge tone="primary" size="sm" dot>
                          Current plan
                        </Badge>
                      )}
                    </header>
                    <p className={styles.planCost}>
                      <span className={styles.amount}>{formatCurrency(p.price)}</span>
                      <span className={styles.per}>/ {durationLabel(p.durationDays)}</span>
                    </p>
                    {Array.isArray(p.features) && p.features.length > 0 && (
                      <ul className={styles.planFeatures}>
                        {p.features.map((f) => (
                          <li key={f}>
                            <Icon name="check" size={15} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className={styles.planFooter}>
                      {isCurrent ? (
                        <Button variant="secondary" fullWidth disabled>
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          variant={currentPlanId ? 'outline' : 'primary'}
                          fullWidth
                          iconRight="arrowRight"
                          onClick={() => setChosenPlan(p)}
                          disabled={subscribing || membershipQuery.loading}
                        >
                          {currentPlanId ? `Switch to ${p.name}` : `Choose ${p.name}`}
                        </Button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card title="Payment history" subtitle="Your most recent payments first">
        {paymentsQuery.error ? (
          <ErrorState message={paymentsQuery.error} onRetry={paymentsQuery.refetch} compact />
        ) : (
          <>
            <Table
              columns={paymentColumns}
              data={toList(paymentsQuery.data)}
              loading={paymentsQuery.loading}
              skeletonRows={5}
              caption="Payment history"
              emptyTitle="No payments yet"
              emptyMessage="Payments will appear here once you subscribe to a plan."
            />
            {!paymentsQuery.loading && (
              <Pagination
                page={paymentsQuery.data?.page || paymentsPage}
                pages={paymentsQuery.data?.pages || 1}
                total={paymentsQuery.data?.total}
                limit={PAYMENTS_LIMIT}
                onPageChange={setPaymentsPage}
              />
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel your membership?"
        message={`You'll lose access to bookings and classes${
          membership?.endDate ? ` — your plan ends ${formatDate(membership.endDate)}` : ''
        }. This can't be undone.`}
        confirmLabel="Cancel membership"
        cancelLabel="Keep membership"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(chosenPlan)}
        title={currentPlanId ? `Switch to ${chosenPlan?.name}?` : `Subscribe to ${chosenPlan?.name}?`}
        message={
          chosenPlan
            ? `You'll be charged ${formatCurrency(chosenPlan.price)} for ${durationLabel(chosenPlan.durationDays)} (${chosenPlan.durationDays} days).`
            : ''
        }
        confirmLabel={currentPlanId ? 'Switch plan' : 'Subscribe'}
        loading={subscribing}
        onConfirm={handleSubscribe}
        onCancel={() => setChosenPlan(null)}
      />
    </div>
  );
}

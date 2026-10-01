import { useMemo } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { SkeletonGrid } from '../common/Skeleton';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import { getPlans } from '../../api/membershipApi';
import { toList } from '../../api/axios';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from '../../styles/LandingSections.module.css';

export function durationLabel(days) {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return '';
  if (d === 1) return 'day';
  if (d === 7) return 'week';
  if (d >= 28 && d <= 31) return 'month';
  if (d >= 360 && d <= 366) return 'year';
  if (d % 30 === 0) return `${d / 30} months`;
  if (d % 7 === 0) return `${d / 7} weeks`;
  return `${d} days`;
}

export default function PlansSection() {
  const { user, isAuthenticated } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => getPlans(), []);

  const plans = useMemo(
    () =>
      toList(data)
        .filter((p) => p && p.active !== false)
        .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)),
    [data]
  );

  const popularIndex = useMemo(() => {
    const flagged = plans.findIndex((p) => p.popular || p.isPopular || p.featured);
    if (flagged >= 0) return flagged;
    return plans.length > 1 ? Math.floor(plans.length / 2) : -1;
  }, [plans]);

  const ctaTo = isAuthenticated && user?.role === 'member' ? '/app/membership' : '/register';

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={3} lines={5} minWidth={260} label="Loading plans…" />;
  } else if (error) {
    content = <ErrorState compact title="Couldn't load plans" message={error} onRetry={refetch} />;
  } else if (!plans.length) {
    content = (
      <EmptyState
        compact
        icon="card"
        title="Plans coming soon"
        message="We're finalising our membership options. Create an account to be first in line."
        action={
          <Button to="/register" size="sm">
            Join the waitlist
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className={styles.planGrid}>
        {plans.map((plan, i) => {
          const popular = i === popularIndex;
          const per = durationLabel(plan.durationDays);
          const features = Array.isArray(plan.features) ? plan.features.filter(Boolean) : [];
          return (
            <Reveal as="li" key={plan._id || plan.name} delay={i * 80} className={styles.planItem}>
              <article className={`${styles.plan} ${popular ? styles.planPopular : ''}`}>
                {popular && (
                  <span className={styles.popularTag}>
                    <Icon name="flame" size={14} /> Most popular
                  </span>
                )}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.price}>
                  <strong>{formatCurrency(plan.price)}</strong>
                  {per && <span>/ {per}</span>}
                </p>
                {plan.description && <p className={styles.planDesc}>{plan.description}</p>}
                {features.length > 0 ? (
                  <ul className={styles.features}>
                    {features.map((f, idx) => (
                      <li key={`${idx}-${f}`}>
                        <span className={styles.featureIcon}>
                          <Icon name="check" size={14} strokeWidth={2.6} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.planDesc}>
                    Full gym access for {plan.durationDays || '—'} days.
                  </p>
                )}
                <Button
                  to={ctaTo}
                  variant={popular ? 'primary' : 'outline'}
                  fullWidth
                  iconRight="arrowRight"
                  className={styles.planCta}
                >
                  {isAuthenticated ? 'Choose plan' : 'Get started'}
                </Button>
              </article>
            </Reveal>
          );
        })}
      </ul>
    );
  }

  return (
    <section id="plans" className={styles.section} aria-labelledby="plans-title">
      <div className={styles.container}>
        <SectionHeading
          id="plans-title"
          eyebrow="Memberships"
          title="Pick your pace. Change it anytime."
          subtitle="No hidden fees, no lock-in contracts — just the access you need to keep showing up."
        />
        {content}
      </div>
    </section>
  );
}

import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { SkeletonGrid } from '../common/Skeleton';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import { getTrainers } from '../../api/trainerApi';
import { toList } from '../../api/axios';
import styles from '../../styles/LandingSections.module.css';

export default function TrainersSection() {
  const { user, isAuthenticated } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => getTrainers({ limit: 4 }), []);
  const trainers = toList(data).slice(0, 4);
  const browseTo = isAuthenticated && user?.role === 'member' ? '/app/trainers' : '/register';

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={4} lines={3} minWidth={220} label="Loading trainers…" />;
  } else if (error) {
    content = <ErrorState compact title="Couldn't load trainers" message={error} onRetry={refetch} />;
  } else if (!trainers.length) {
    content = (
      <EmptyState
        compact
        icon="whistle"
        title="Coaches are warming up"
        message="Our trainer line-up will be announced soon."
      />
    );
  } else {
    content = (
      <ul className={styles.trainerGrid}>
        {trainers.map((t, i) => {
          const specs = Array.isArray(t.specializations) ? t.specializations.filter(Boolean) : [];
          return (
            <Reveal as="li" key={t._id || t.name} delay={i * 80}>
              <article className={styles.trainer}>
                <div className={styles.trainerAvatar}>
                  <Avatar src={t.avatarUrl} name={t.name} size={88} ring />
                </div>
                <h3 className={styles.trainerName}>{t.name}</h3>
                {t.bio && <p className={styles.trainerBio}>{t.bio}</p>}
                {specs.length > 0 && (
                  <ul className={styles.specs} aria-label={`${t.name}'s specialisations`}>
                    {specs.slice(0, 3).map((s, j) => (
                      <li key={`${j}-${s}`}>
                        <Badge tone={j === 0 ? 'primary' : 'neutral'} size="sm">
                          {s}
                        </Badge>
                      </li>
                    ))}
                    {specs.length > 3 && (
                      <li>
                        <Badge tone="neutral" size="sm">
                          +{specs.length - 3}
                        </Badge>
                      </li>
                    )}
                  </ul>
                )}
              </article>
            </Reveal>
          );
        })}
      </ul>
    );
  }

  return (
    <section id="trainers" className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="trainers-title">
      <div className={styles.container}>
        <SectionHeading
          id="trainers-title"
          eyebrow="Coaches"
          title="Meet the people who'll push you."
          subtitle="Certified, obsessed with form, and genuinely in your corner."
          action={
            <Button to={browseTo} variant="secondary" iconRight="arrowRight">
              {isAuthenticated ? 'Browse trainers' : 'Train with them'}
            </Button>
          }
        />
        {content}
      </div>
    </section>
  );
}

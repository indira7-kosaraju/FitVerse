import { useEffect, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonGrid } from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { getTrainers } from '../../api/trainerApi';
import { toList } from '../../api/axios';
import { SPECIALIZATIONS } from '../../utils/constants';
import styles from '../../styles/Trainers.module.css';

const LIMIT = 12;

export default function Trainers() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, specialization]);

  const { data, loading, error, refetch } = useFetch(
    () => getTrainers({ search: debouncedSearch, specialization, page, limit: LIMIT }),
    [debouncedSearch, specialization, page]
  );

  const trainers = toList(data);
  const filtersActive = Boolean(debouncedSearch || specialization);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Coaching team"
        title="Trainers"
        subtitle="Find the coach who matches your goals — strength, mobility, weight loss and more."
      />

      <section className={styles.filters} aria-label="Filter trainers">
        <Input
          label="Search trainers"
          hideLabel
          type="search"
          icon="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
        <Select
          label="Specialization"
          hideLabel
          placeholder="All specializations"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          options={SPECIALIZATIONS.map((s) => ({ value: s, label: s }))}
          className={styles.select}
        />
      </section>

      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonGrid count={6} lines={4} minWidth={260} label="Loading trainers…" />
      ) : trainers.length === 0 ? (
        <EmptyState
          icon="users"
          title={filtersActive ? 'No trainers match' : 'No trainers yet'}
          message={filtersActive ? 'Try a different name or specialization.' : 'Our coaching team will appear here soon.'}
          action={
            filtersActive && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setSpecialization('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className={styles.grid}>
            {trainers.map((t) => {
              const specs = Array.isArray(t.specializations) ? t.specializations : [];
              return (
                <li key={t._id}>
                  <article className={styles.card}>
                    <div className={styles.cardTop}>
                      <Avatar src={t.avatarUrl} name={t.name} size={72} ring />
                      <div className={styles.identity}>
                        <h2 className={styles.name}>{t.name}</h2>
                        <p className={styles.role}>Personal trainer</p>
                      </div>
                    </div>
                    {specs.length > 0 && (
                      <ul className={styles.specs} aria-label="Specializations">
                        {specs.slice(0, 4).map((s) => (
                          <li key={s}>
                            <Badge tone="primary" size="sm">
                              {s}
                            </Badge>
                          </li>
                        ))}
                        {specs.length > 4 && (
                          <li>
                            <Badge tone="neutral" size="sm">
                              +{specs.length - 4}
                            </Badge>
                          </li>
                        )}
                      </ul>
                    )}
                    <p className={styles.bio}>{t.bio || 'This trainer hasn’t added a bio yet.'}</p>
                    <div className={styles.cardFooter}>
                      <Button
                        to={`/app/trainers/${t._id}`}
                        variant="outline"
                        size="sm"
                        iconRight="arrowRight"
                        aria-label={`View profile of ${t.name}`}
                      >
                        View profile
                      </Button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={data?.page || page}
            pages={data?.pages || 1}
            total={data?.total}
            limit={LIMIT}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}

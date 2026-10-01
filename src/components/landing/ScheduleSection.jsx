import { useMemo } from 'react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ClassCard from '../common/ClassCard';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { SkeletonGrid } from '../common/Skeleton';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import { getClasses } from '../../api/classApi';
import { toList } from '../../api/axios';
import { addDays, formatDate, isPast, isSameDay, startOfWeek } from '../../utils/formatDate';
import { WEEKDAYS } from '../../utils/constants';
import styles from '../../styles/LandingSections.module.css';

export default function ScheduleSection() {
  const { user, isAuthenticated } = useAuth();
  const range = useMemo(() => {
    const from = startOfWeek(new Date());
    return { from, to: addDays(from, 7) };
  }, []);

  const { data, loading, error, refetch } = useFetch(
    () => getClasses({ from: range.from.toISOString(), to: range.to.toISOString(), limit: 8, sort: 'startTime' }),
    [range]
  );

  const bookTo = isAuthenticated && user?.role === 'member' ? '/app/classes' : '/login';

  const days = useMemo(() => {
    const classes = toList(data)
      .filter((c) => c && c.startTime)
      .map((c) => ({ ...c, trainer: c.trainer && typeof c.trainer === 'object' ? c.trainer : null }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    return WEEKDAYS.map((label, i) => {
      const date = addDays(range.from, i);
      return { label, date, classes: classes.filter((c) => isSameDay(c.startTime, date)) };
    }).filter((d) => d.classes.length > 0);
  }, [data, range]);

  const today = new Date();

  let content;
  if (loading && !data) {
    content = <SkeletonGrid count={4} lines={3} minWidth={240} label="Loading this week's classes…" />;
  } else if (error) {
    content = <ErrorState compact title="Couldn't load the schedule" message={error} onRetry={refetch} />;
  } else if (!days.length) {
    content = (
      <EmptyState
        compact
        icon="calendar"
        title="No classes scheduled this week"
        message="The timetable for next week drops soon — check back shortly."
      />
    );
  } else {
    content = (
      <ol className={styles.week}>
        {days.map((day, i) => {
          const isToday = isSameDay(day.date, today);
          return (
            <Reveal as="li" key={day.label} delay={i * 60} className={styles.day}>
              <h3 className={`${styles.dayHead} ${isToday ? styles.today : ''}`}>
                <span className={styles.dayName}>{day.label}</span>
                <span className={styles.dayDate}>{formatDate(day.date, { month: 'short', day: 'numeric' })}</span>
                {isToday && (
                  <Badge tone="primary" size="sm" dot>
                    Today
                  </Badge>
                )}
              </h3>
              <ul className={styles.dayClasses}>
                {day.classes.map((c) => (
                  <li key={c._id}>
                    <ClassCard
                      gymClass={c}
                      compact
                      actions={
                        isPast(c.startTime) ? (
                          <Badge tone="neutral">Finished</Badge>
                        ) : (
                          <Button to={bookTo} size="sm" icon="plus" aria-label={`Book ${c.title}`}>
                            Book
                          </Button>
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </ol>
    );
  }

  return (
    <section id="schedule" className={styles.section} aria-labelledby="schedule-title">
      <div className={styles.container}>
        <SectionHeading
          id="schedule-title"
          eyebrow="This week"
          title="Sweat on the schedule."
          subtitle="A taste of what's on this week. Members can book a spot in two taps."
          action={
            <Button to={bookTo} variant="secondary" icon="calendar">
              Full timetable
            </Button>
          }
        />
        {content}
      </div>
    </section>
  );
}

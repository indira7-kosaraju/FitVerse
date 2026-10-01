import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import { CLASS_TYPES } from '../../utils/constants';
import { formatTimeRange, relativeDay, isPast } from '../../utils/formatDate';
import styles from '../../styles/ClassCard.module.css';

export const classTypeLabel = (type) => CLASS_TYPES.find((t) => t.value === type)?.label || type;

/**
 * Displays a GymClass. If onBook / onCancel are passed, shows the booking action:
 *  - isBookedByMe → "Cancel booking"
 *  - full → disabled "Class full"
 *  - otherwise → "Book"
 * `actions` overrides the footer entirely (e.g. trainer/admin controls).
 */
export default function ClassCard({ gymClass, onBook, onCancel, pending = false, actions, trainerLinkBase, compact = false }) {
  const { title, type, trainer, startTime, endTime, capacity = 0, bookedCount = 0, location, isBookedByMe } = gymClass;
  const full = bookedCount >= capacity;
  const past = isPast(startTime);
  const spotsLeft = Math.max(0, capacity - bookedCount);

  let footer = actions;
  if (!footer && (onBook || onCancel)) {
    if (past) footer = <Badge tone="neutral">Finished</Badge>;
    else if (isBookedByMe)
      footer = (
        <Button variant="outline" size="sm" onClick={() => onCancel?.(gymClass)} loading={pending} icon="close">
          Cancel booking
        </Button>
      );
    else if (full)
      footer = (
        <Button variant="secondary" size="sm" disabled>
          Class full
        </Button>
      );
    else
      footer = (
        <Button size="sm" onClick={() => onBook?.(gymClass)} loading={pending} icon="plus">
          Book
        </Button>
      );
  }

  return (
    <article className={`${styles.card} ${isBookedByMe ? styles.booked : ''} ${compact ? styles.compact : ''}`}>
      <div className={styles.top}>
        <span className={`${styles.type} ${styles[`type-${type}`] || ''}`}>{classTypeLabel(type)}</span>
        {isBookedByMe && (
          <Badge tone="primary" size="sm" dot>
            Booked
          </Badge>
        )}
        {!isBookedByMe && full && !past && (
          <Badge tone="danger" size="sm">
            Full
          </Badge>
        )}
      </div>

      <h3 className={styles.title}>{title}</h3>

      <ul className={styles.meta}>
        <li>
          <Icon name="clock" size={15} />
          <span>
            {relativeDay(startTime)} · {formatTimeRange(startTime, endTime)}
          </span>
        </li>
        {location && (
          <li>
            <Icon name="mapPin" size={15} />
            <span>{location}</span>
          </li>
        )}
      </ul>

      {trainer && (
        <div className={styles.trainer}>
          <Avatar src={trainer.avatarUrl} name={trainer.name} size={28} />
          {trainerLinkBase ? (
            <Link to={`${trainerLinkBase}/${trainer._id}`}>{trainer.name}</Link>
          ) : (
            <span>{trainer.name}</span>
          )}
        </div>
      )}

      {!compact && (
        <ProgressBar
          value={bookedCount}
          max={capacity}
          capacity
          size="sm"
          label={full ? 'No spots left' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
          showValue
        />
      )}

      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  );
}

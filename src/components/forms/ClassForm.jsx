import { useEffect, useMemo, useState } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import Toggle from '../common/Toggle';
import Icon from '../common/Icon';
import { CLASS_TYPES, WEEKDAYS } from '../../utils/constants';
import { classSchema, validate, rules, hasErrors } from '../../utils/validators';
import { toDateTimeLocal, startOfWeek, addDays } from '../../utils/formatDate';
import styles from '../../styles/ClassForm.module.css';

const DEFAULT_DURATION_MIN = 60;

/** Monday-based weekday index (0 = Mon … 6 = Sun). */
const mondayIndex = (date) => (date.getDay() + 6) % 7;

const nextFullHour = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};

const parseLocal = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const idOf = (ref) => (ref && typeof ref === 'object' ? ref._id : ref) || '';

function joinLabels(labels) {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}

/**
 * Expands a ClassForm payload into one payload per occurrence.
 * Occurrences fall on each selected weekday for `weeks` weeks, starting from the
 * week of the start date; only occurrences at/after the start are kept.
 * Time of day and duration are preserved. The `recurrence` key is stripped.
 */
export function buildOccurrences(payload) {
  if (!payload) return [];
  const { recurrence, ...base } = payload;
  const start = new Date(base.startTime);
  const end = new Date(base.endTime);
  if (!recurrence || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [base];

  const weeks = Math.max(1, Math.min(52, Number(recurrence.weeks) || 1));
  const weekdays = Array.from(new Set((recurrence.weekdays || []).map(Number)))
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (weekdays.length === 0) return [base];

  const durationMs = end.getTime() - start.getTime();
  const weekStart = startOfWeek(start);
  const out = [];

  for (let w = 0; w < weeks; w += 1) {
    weekdays.forEach((wd) => {
      const s = addDays(weekStart, w * 7 + wd);
      s.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      if (s.getTime() < start.getTime()) return;
      const e = new Date(s.getTime() + durationMs);
      out.push({ ...base, startTime: s.toISOString(), endTime: e.toISOString() });
    });
  }
  return out;
}

function initialState(initialValues) {
  if (initialValues) {
    return {
      title: initialValues.title || '',
      type: initialValues.type || '',
      trainer: idOf(initialValues.trainer),
      startTime: initialValues.startTime ? toDateTimeLocal(initialValues.startTime) : '',
      endTime: initialValues.endTime ? toDateTimeLocal(initialValues.endTime) : '',
      capacity: initialValues.capacity != null ? String(initialValues.capacity) : '',
      location: initialValues.location || '',
      description: initialValues.description || '',
    };
  }
  const start = nextFullHour();
  const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60000);
  return {
    title: '',
    type: '',
    trainer: '',
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(end),
    capacity: '20',
    location: '',
    description: '',
  };
}

export default function ClassForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  serverErrors,
  trainerOptions,
  allowRecurring = false,
}) {
  const [values, setValues] = useState(() => initialState(initialValues));
  const [errors, setErrors] = useState({});
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState('4');
  const [weekdays, setWeekdays] = useState(() => {
    const d = parseLocal(initialState(initialValues).startTime);
    return d ? [mondayIndex(d)] : [0];
  });
  const [weekdaysTouched, setWeekdaysTouched] = useState(false);

  const canRepeat = allowRecurring && !initialValues;
  const showTrainer = Array.isArray(trainerOptions);

  // Merge server-side field errors whenever the parent passes new ones.
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    clearError(field);
  };

  const handleStartChange = (value) => {
    setValues((prev) => {
      const next = { ...prev, startTime: value };
      const newStart = parseLocal(value);
      const oldStart = parseLocal(prev.startTime);
      const oldEnd = parseLocal(prev.endTime);
      if (newStart && (!oldEnd || oldEnd <= newStart)) {
        const duration =
          oldStart && oldEnd && oldEnd > oldStart ? oldEnd - oldStart : DEFAULT_DURATION_MIN * 60000;
        next.endTime = toDateTimeLocal(new Date(newStart.getTime() + duration));
      }
      return next;
    });
    clearError('startTime');
    clearError('endTime');
    const d = parseLocal(value);
    if (d && !weekdaysTouched) setWeekdays([mondayIndex(d)]);
  };

  const toggleWeekday = (idx) => {
    setWeekdaysTouched(true);
    setWeekdays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b)));
    clearError('weekdays');
  };

  const buildPayload = () => {
    const payload = {
      title: values.title.trim(),
      type: values.type,
      startTime: new Date(values.startTime).toISOString(),
      endTime: new Date(values.endTime).toISOString(),
      capacity: Number(values.capacity),
      location: values.location.trim(),
      description: values.description.trim(),
      recurrence: canRepeat && repeat ? { weeks: Number(weeks), weekdays: [...weekdays].sort((a, b) => a - b) } : null,
    };
    if (showTrainer) payload.trainer = values.trainer;
    return payload;
  };

  const preview = useMemo(() => {
    if (!canRepeat || !repeat) return null;
    const n = Number(weeks);
    if (!Number.isInteger(n) || n < 1 || n > 12 || weekdays.length === 0) return null;
    const start = parseLocal(values.startTime);
    const end = parseLocal(values.endTime);
    if (!start || !end || end <= start) return null;
    const count = buildOccurrences({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      recurrence: { weeks: n, weekdays },
    }).length;
    const days = joinLabels([...weekdays].sort((a, b) => a - b).map((d) => WEEKDAYS[d]));
    return `Creates ${count} class${count === 1 ? '' : 'es'}: ${days} for ${n} week${n === 1 ? '' : 's'}`;
  }, [canRepeat, repeat, weeks, weekdays, values.startTime, values.endTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const schema = { ...classSchema };
    if (showTrainer) schema.trainer = [rules.required('Trainer is required')];
    const nextErrors = validate(values, schema);
    if (canRepeat && repeat) {
      const weekErr =
        rules.required('Number of weeks is required')(weeks) ||
        rules.number({ min: 1, max: 12, integer: true, msg: 'Choose between 1 and 12 weeks' })(weeks);
      if (weekErr) nextErrors.weeks = weekErr;
      if (weekdays.length === 0) nextErrors.weekdays = 'Pick at least one weekday';
    }
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    onSubmit?.(buildPayload());
  };

  const typeOptions = CLASS_TYPES;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.grid}>
        <Input
          className={styles.full}
          label="Title"
          required
          value={values.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          placeholder="e.g. Sunrise HIIT Blast"
          maxLength={120}
        />
        <Select
          label="Type"
          required
          options={typeOptions}
          placeholder="Select a type"
          value={values.type}
          onChange={(e) => setField('type', e.target.value)}
          error={errors.type}
        />
        {showTrainer ? (
          <Select
            label="Trainer"
            required
            options={trainerOptions}
            placeholder="Select a trainer"
            value={values.trainer}
            onChange={(e) => setField('trainer', e.target.value)}
            error={errors.trainer}
          />
        ) : (
          <Input
            label="Capacity"
            required
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            value={values.capacity}
            onChange={(e) => setField('capacity', e.target.value)}
            error={errors.capacity}
            suffix="spots"
          />
        )}
        <Input
          label="Starts"
          required
          type="datetime-local"
          value={values.startTime}
          onChange={(e) => handleStartChange(e.target.value)}
          error={errors.startTime}
        />
        <Input
          label="Ends"
          required
          type="datetime-local"
          value={values.endTime}
          min={values.startTime || undefined}
          onChange={(e) => setField('endTime', e.target.value)}
          error={errors.endTime}
        />
        {showTrainer && (
          <Input
            label="Capacity"
            required
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            value={values.capacity}
            onChange={(e) => setField('capacity', e.target.value)}
            error={errors.capacity}
            suffix="spots"
          />
        )}
        <Input
          className={showTrainer ? undefined : styles.full}
          label="Location"
          required
          icon="mapPin"
          value={values.location}
          onChange={(e) => setField('location', e.target.value)}
          error={errors.location}
          placeholder="e.g. Studio A"
        />
        <Input
          className={styles.full}
          as="textarea"
          label="Description"
          rows={3}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          error={errors.description}
          placeholder="What should members expect?"
          maxLength={1000}
        />
      </div>

      {canRepeat && (
        <fieldset className={styles.recurrence}>
          <legend className="sr-only">Recurrence</legend>
          <Toggle
            checked={repeat}
            onChange={(v) => {
              setRepeat(v);
              clearError('weeks');
              clearError('weekdays');
            }}
            label="Repeat weekly"
            description="Schedule this class on the same time across several weeks."
          />
          {repeat && (
            <div className={styles.recurrenceBody}>
              <div className={styles.weekdaysField}>
                <span className={styles.groupLabel} id="classform-weekdays-label">
                  Repeat on
                </span>
                <div className={styles.chips} role="group" aria-labelledby="classform-weekdays-label">
                  {WEEKDAYS.map((label, idx) => {
                    const active = weekdays.includes(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                        aria-pressed={active}
                        onClick={() => toggleWeekday(idx)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.weekdays && (
                  <p className={styles.error} role="alert">
                    {errors.weekdays}
                  </p>
                )}
              </div>
              <Input
                className={styles.weeksInput}
                label="Number of weeks"
                type="number"
                min={1}
                max={12}
                inputMode="numeric"
                value={weeks}
                onChange={(e) => {
                  setWeeks(e.target.value);
                  clearError('weeks');
                }}
                error={errors.weeks}
                hint="1–12 weeks"
              />
              {preview && (
                <p className={styles.preview} aria-live="polite">
                  <Icon name="calendar" size={16} />
                  {preview}
                </p>
              )}
            </div>
          )}
        </fieldset>
      )}

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} icon="check">
          Save
        </Button>
      </div>
    </form>
  );
}

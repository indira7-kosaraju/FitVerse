import { useEffect, useMemo, useRef, useState } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { validateWorkout, hasErrors } from '../../utils/validators';
import { toISODate } from '../../utils/formatDate';
import styles from '../../styles/WorkoutForm.module.css';

let uid = 0;
const nextKey = () => {
  uid += 1;
  return `k${uid}`;
};

const emptySet = (reps = '', weightKg = '') => ({ key: nextKey(), reps, weightKg });
const emptyExercise = (name = '', sets) => ({ key: nextKey(), name, sets: sets || [emptySet()] });

const str = (v) => (v === undefined || v === null ? '' : String(v));

function toFormValues(initial) {
  if (!initial) {
    return { date: toISODate(new Date()), durationMin: '', notes: '', exercises: [emptyExercise()] };
  }
  const exercises = (initial.exercises || []).map((ex) =>
    emptyExercise(
      ex.name || '',
      (ex.sets?.length ? ex.sets : [{}]).map((s) => emptySet(str(s.reps), str(s.weightKg)))
    )
  );
  return {
    date: initial.date ? toISODate(initial.date) : toISODate(new Date()),
    durationMin: str(initial.durationMin),
    notes: initial.notes || '',
    exercises: exercises.length ? exercises : [emptyExercise()],
  };
}

/** Converts a yyyy-mm-dd string to an ISO timestamp, keeping the original time when the day is unchanged. */
function dateToISO(dateStr, originalDate) {
  if (originalDate && toISODate(originalDate) === dateStr) return new Date(originalDate).toISOString();
  if (dateStr === toISODate(new Date())) return new Date().toISOString();
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

const dayLabel = (d) => d.label || [d.weekLabel, d.name].filter(Boolean).join(' · ') || 'Plan day';

/**
 * Create / edit a workout log.
 * planDays: [{ id|_id, label ("Week 1 · Push day") | name, exercises: [{ name, sets, reps }] }]
 */
export default function WorkoutForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  serverErrors,
  planDays,
}) {
  const [values, setValues] = useState(() => toFormValues(initialValues));
  const [errors, setErrors] = useState({});
  const [planDay, setPlanDay] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) setErrors((e) => ({ ...e, ...serverErrors }));
  }, [serverErrors]);

  const planOptions = useMemo(
    () => (planDays || []).map((d, i) => ({ value: String(d.id || d._id || i), label: dayLabel(d), day: d })),
    [planDays]
  );

  const clearError = (key) =>
    setErrors((e) => {
      if (!e[key] && !e.form) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  // Structural changes shift indexes, so drop all exercise-scoped errors.
  const clearExerciseErrors = () =>
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('exercises'))));

  const setField = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    clearError(field);
  };

  const updateExercise = (i, patch) =>
    setValues((v) => ({ ...v, exercises: v.exercises.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)) }));

  const setExerciseName = (i, name) => {
    updateExercise(i, { name });
    clearError(`exercises.${i}.name`);
  };

  const setSetField = (i, j, field, value) => {
    setValues((v) => ({
      ...v,
      exercises: v.exercises.map((ex, idx) =>
        idx === i ? { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === j ? { ...s, [field]: value } : s)) } : ex
      ),
    }));
    clearError(`exercises.${i}.sets.${j}.${field}`);
  };

  const addExercise = () => {
    setValues((v) => ({ ...v, exercises: [...v.exercises, emptyExercise()] }));
    clearError('exercises');
    requestAnimationFrame(() => {
      const inputs = formRef.current?.querySelectorAll('[data-exercise-name]');
      inputs?.[inputs.length - 1]?.focus();
    });
  };

  const removeExercise = (i) => {
    setValues((v) => ({ ...v, exercises: v.exercises.filter((_, idx) => idx !== i) }));
    clearExerciseErrors();
  };

  const addSet = (i) => {
    setValues((v) => ({
      ...v,
      exercises: v.exercises.map((ex, idx) => (idx === i ? { ...ex, sets: [...ex.sets, emptySet()] } : ex)),
    }));
    clearError(`exercises.${i}.sets`);
  };

  const duplicateLastSet = (i) => {
    setValues((v) => ({
      ...v,
      exercises: v.exercises.map((ex, idx) => {
        if (idx !== i) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, emptySet(last?.reps ?? '', last?.weightKg ?? '')] };
      }),
    }));
    clearError(`exercises.${i}.sets`);
  };

  const removeSet = (i, j) => {
    setValues((v) => ({
      ...v,
      exercises: v.exercises.map((ex, idx) => (idx === i ? { ...ex, sets: ex.sets.filter((_, s) => s !== j) } : ex)),
    }));
    clearExerciseErrors();
  };

  const loadFromPlan = () => {
    const opt = planOptions.find((o) => o.value === planDay);
    if (!opt) return;
    const exercises = (opt.day.exercises || []).map((ex) => {
      const count = Math.min(20, Math.max(1, parseInt(ex.sets, 10) || 1));
      const reps = parseInt(ex.reps, 10);
      return emptyExercise(
        ex.name || '',
        Array.from({ length: count }, () => emptySet(Number.isFinite(reps) ? String(reps) : '', ''))
      );
    });
    setValues((v) => ({ ...v, exercises: exercises.length ? exercises : [emptyExercise()] }));
    clearExerciseErrors();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateWorkout(values);
    if (hasErrors(found)) {
      setErrors(found);
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    const payload = {
      date: dateToISO(values.date, initialValues?.date),
      durationMin: values.durationMin === '' ? undefined : Number(values.durationMin),
      notes: values.notes.trim(),
      exercises: values.exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.map((s) => ({
          reps: Number(s.reps),
          weightKg: s.weightKg === '' || s.weightKg === null ? 0 : Number(s.weightKg),
        })),
      })),
    };
    await onSubmit(payload);
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.topFields}>
        <Input
          label="Date"
          type="date"
          required
          value={values.date}
          max={toISODate(new Date())}
          onChange={(e) => setField('date', e.target.value)}
          error={errors.date}
        />
        <Input
          label="Duration"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          suffix="min"
          placeholder="60"
          value={values.durationMin}
          onChange={(e) => setField('durationMin', e.target.value)}
          error={errors.durationMin}
        />
      </div>

      {planOptions.length > 0 && (
        <div className={styles.planLoader}>
          <Select
            label="Load from plan"
            placeholder="Choose a plan day…"
            options={planOptions}
            value={planDay}
            onChange={(e) => setPlanDay(e.target.value)}
            hint="Replaces the exercises below with the plan day's exercises."
          />
          <Button variant="secondary" icon="clipboard" onClick={loadFromPlan} disabled={!planDay}>
            Load from plan
          </Button>
        </div>
      )}

      <fieldset className={styles.exercises}>
        <legend className={styles.legend}>Exercises</legend>
        {errors.exercises && (
          <p className={styles.error} role="alert">
            {errors.exercises}
          </p>
        )}

        <ol className={styles.exerciseList}>
          {values.exercises.map((ex, i) => {
            const n = i + 1;
            const setsErr = errors[`exercises.${i}.sets`];
            return (
              <li key={ex.key} className={styles.exercise}>
                <div className={styles.exerciseHead}>
                  <span className={styles.exerciseNum} aria-hidden="true">
                    {n}
                  </span>
                  <Input
                    label={`Exercise ${n} name`}
                    hideLabel
                    placeholder="e.g. Bench press"
                    value={ex.name}
                    data-exercise-name
                    onChange={(e) => setExerciseName(i, e.target.value)}
                    error={errors[`exercises.${i}.name`]}
                    className={styles.exerciseName}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon="trash"
                    aria-label={`Remove exercise ${n}${ex.name ? ` (${ex.name})` : ''}`}
                    onClick={() => removeExercise(i)}
                    disabled={values.exercises.length === 1}
                  />
                </div>

                <table className={styles.setsTable}>
                  <caption className="sr-only">Sets for exercise {n}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Set</th>
                      <th scope="col">Reps</th>
                      <th scope="col">Weight (kg)</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s, j) => (
                      <tr key={s.key}>
                        <th scope="row" className={styles.setNum}>
                          {j + 1}
                        </th>
                        <td>
                          <Input
                            label={`Exercise ${n} set ${j + 1} reps`}
                            hideLabel
                            type="number"
                            inputMode="numeric"
                            min={1}
                            placeholder="10"
                            value={s.reps}
                            onChange={(e) => setSetField(i, j, 'reps', e.target.value)}
                            error={errors[`exercises.${i}.sets.${j}.reps`]}
                          />
                        </td>
                        <td>
                          <Input
                            label={`Exercise ${n} set ${j + 1} weight in kg`}
                            hideLabel
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.5"
                            placeholder="0"
                            value={s.weightKg}
                            onChange={(e) => setSetField(i, j, 'weightKg', e.target.value)}
                            error={errors[`exercises.${i}.sets.${j}.weightKg`]}
                          />
                        </td>
                        <td className={styles.setAction}>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon="minus"
                            aria-label={`Remove set ${j + 1} from exercise ${n}`}
                            onClick={() => removeSet(i, j)}
                            disabled={ex.sets.length === 1}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {setsErr && (
                  <p className={styles.error} role="alert">
                    {setsErr}
                  </p>
                )}

                <div className={styles.setButtons}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="plus"
                    onClick={() => addSet(i)}
                    aria-label={`Add set to exercise ${n}`}
                  >
                    Add set
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="copy"
                    onClick={() => duplicateLastSet(i)}
                    disabled={ex.sets.length === 0}
                    aria-label={`Duplicate last set of exercise ${n}`}
                  >
                    Duplicate last
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>

        <Button variant="outline" icon="plus" onClick={addExercise} className={styles.addExercise}>
          Add exercise
        </Button>
      </fieldset>

      <Input
        as="textarea"
        label="Notes"
        rows={3}
        placeholder="How did it feel? PRs, energy, anything to remember…"
        value={values.notes}
        onChange={(e) => setField('notes', e.target.value)}
        error={errors.notes}
        maxLength={1000}
      />

      {errors.form && (
        <p className={styles.error} role="alert">
          {errors.form}
        </p>
      )}

      <div className={styles.footer}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting} icon="check">
          {initialValues ? 'Save changes' : 'Log workout'}
        </Button>
      </div>
    </form>
  );
}

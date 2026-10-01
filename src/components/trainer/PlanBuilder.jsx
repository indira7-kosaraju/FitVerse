import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import Icon from '../common/Icon';
import { createWorkoutPlan, updateWorkoutPlan } from '../../api/workoutApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { rules } from '../../utils/validators';
import styles from '../../styles/PlanBuilder.module.css';

let keySeed = 0;
const newKey = () => {
  keySeed += 1;
  return `k${Date.now().toString(36)}${keySeed}`;
};

const blankExercise = () => ({ _key: newKey(), name: '', sets: '3', reps: '10', notes: '' });
const blankDay = (n = 1) => ({ _key: newKey(), name: `Day ${n}`, exercises: [blankExercise()] });
const blankWeek = () => ({ _key: newKey(), days: [blankDay(1)] });

/** Adds client-only `_key`s and stringifies numbers for inputs. */
function toEditable(plan) {
  const weeks = Array.isArray(plan?.weeks) && plan.weeks.length ? plan.weeks : [{ days: [] }];
  return {
    title: plan?.title || '',
    weeks: weeks.map((w) => ({
      ...w,
      _key: newKey(),
      days: (w.days || []).map((d) => ({
        ...d,
        _key: newKey(),
        name: d.name || '',
        exercises: (d.exercises || []).map((ex) => ({
          ...ex,
          _key: newKey(),
          name: ex.name || '',
          sets: ex.sets != null ? String(ex.sets) : '',
          reps: ex.reps != null ? String(ex.reps) : '',
          notes: ex.notes || '',
        })),
      })),
    })),
  };
}

/** Strips client keys and converts numeric fields for the API. */
function toPayload(state) {
  return {
    title: state.title.trim(),
    weeks: state.weeks.map(({ _key, ...w }) => ({
      ...w,
      days: w.days.map(({ _key: dk, ...d }) => ({
        ...d,
        name: d.name.trim(),
        exercises: d.exercises.map(({ _key: ek, ...ex }) => ({
          ...ex,
          name: ex.name.trim(),
          sets: Number(ex.sets),
          reps: Number(ex.reps),
          notes: (ex.notes || '').trim(),
        })),
      })),
    })),
  };
}

function validatePlan(state) {
  const errors = {};
  if (!state.title.trim()) errors.title = 'Plan title is required';
  const totalDays = state.weeks.reduce((n, w) => n + w.days.length, 0);
  if (state.weeks.length === 0) errors.weeks = 'Add at least one week';
  else if (totalDays === 0) errors.weeks = 'Add at least one training day';
  state.weeks.forEach((w, wi) => {
    w.days.forEach((d, di) => {
      const base = `weeks.${wi}.days.${di}`;
      if (!d.name.trim()) errors[`${base}.name`] = 'Day name is required';
      if (d.exercises.length === 0) errors[`${base}.exercises`] = 'Add at least one exercise';
      d.exercises.forEach((ex, ei) => {
        const eb = `${base}.exercises.${ei}`;
        if (!ex.name.trim()) errors[`${eb}.name`] = 'Name is required';
        const setsErr =
          rules.required('Required')(ex.sets) || rules.number({ min: 1, max: 100, integer: true, msg: 'Min 1' })(ex.sets);
        if (setsErr) errors[`${eb}.sets`] = setsErr;
        const repsErr =
          rules.required('Required')(ex.reps) || rules.number({ min: 1, max: 1000, integer: true, msg: 'Min 1' })(ex.reps);
        if (repsErr) errors[`${eb}.reps`] = repsErr;
      });
    });
  });
  return errors;
}

const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/**
 * Trainer workout-plan editor.
 * props: { plan (WorkoutPlan | null), memberId, onSaved(plan), onCancel? }
 */
export default function PlanBuilder({ plan, memberId, onSaved, onCancel }) {
  const [state, setState] = useState(() => (plan ? toEditable(plan) : { title: '', weeks: [blankWeek()] }));
  const [planId, setPlanId] = useState(plan?._id || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const completion = useMemo(() => {
    let total = 0;
    let done = 0;
    state.weeks.forEach((w) =>
      w.days.forEach((d) => {
        total += 1;
        if (d.completed) done += 1;
      })
    );
    return { total, done };
  }, [state.weeks]);

  /* ---------- Error helpers ---------- */
  const clearErrors = (...keys) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  // Structural changes shift indices, so drop the nested errors (they're re-shown on next save).
  const clearStructuralErrors = () =>
    setErrors((prev) => (prev.title ? { title: prev.title } : {}));

  /* ---------- State updaters ---------- */
  const updateWeeks = (fn) => setState((s) => ({ ...s, weeks: fn(s.weeks) }));
  const updateWeek = (wi, fn) => updateWeeks((weeks) => weeks.map((w, i) => (i === wi ? fn(w) : w)));
  const updateDay = (wi, di, fn) =>
    updateWeek(wi, (w) => ({ ...w, days: w.days.map((d, i) => (i === di ? fn(d) : d)) }));
  const updateExercise = (wi, di, ei, patch) =>
    updateDay(wi, di, (d) => ({ ...d, exercises: d.exercises.map((ex, i) => (i === ei ? { ...ex, ...patch } : ex)) }));

  const addWeek = () => {
    updateWeeks((weeks) => [...weeks, blankWeek()]);
    clearStructuralErrors();
  };

  const duplicateWeek = (wi) => {
    updateWeeks((weeks) => {
      const src = weeks[wi];
      const copy = {
        _key: newKey(),
        days: src.days.map((d) => ({
          _key: newKey(),
          name: d.name,
          exercises: d.exercises.map((ex) => ({
            _key: newKey(),
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            notes: ex.notes,
          })),
        })),
      };
      const next = weeks.slice();
      next.splice(wi + 1, 0, copy);
      return next;
    });
    clearStructuralErrors();
  };

  const removeWeek = (wi) => {
    updateWeeks((weeks) => weeks.filter((_, i) => i !== wi));
    clearStructuralErrors();
  };

  const addDay = (wi) => {
    updateWeek(wi, (w) => ({ ...w, days: [...w.days, blankDay(w.days.length + 1)] }));
    clearStructuralErrors();
  };

  const removeDay = (wi, di) => {
    updateWeek(wi, (w) => ({ ...w, days: w.days.filter((_, i) => i !== di) }));
    clearStructuralErrors();
  };

  const addExercise = (wi, di) => {
    updateDay(wi, di, (d) => ({ ...d, exercises: [...d.exercises, blankExercise()] }));
    clearStructuralErrors();
  };

  const removeExercise = (wi, di, ei) => {
    updateDay(wi, di, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }));
    clearStructuralErrors();
  };

  const moveExercise = (wi, di, ei, dir) => {
    updateDay(wi, di, (d) => ({ ...d, exercises: move(d.exercises, ei, ei + dir) }));
    clearStructuralErrors();
  };

  /* ---------- Save ---------- */
  const handleSave = async (e) => {
    e.preventDefault();
    const nextErrors = validatePlan(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    const body = { member: memberId, ...toPayload(state) };
    setSaving(true);
    try {
      const saved = planId ? await updateWorkoutPlan(planId, body) : await createWorkoutPlan(body);
      const result = saved && typeof saved === 'object' && Array.isArray(saved.weeks) ? saved : { ...body, _id: planId, ...(saved || {}) };
      toast.success(planId ? 'Workout plan updated' : 'Workout plan created');
      setState(toEditable(result));
      setPlanId(result._id || planId);
      setErrors({});
      onSaved?.(result);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setErrors((prev) => ({ ...prev, ...getFieldErrors(err) }));
    } finally {
      setSaving(false);
    }
  };

  const pct = completion.total ? Math.round((completion.done / completion.total) * 100) : 0;

  return (
    <form className={styles.builder} onSubmit={handleSave} noValidate>
      <div className={styles.head}>
        <Input
          className={styles.title}
          label="Plan title"
          required
          value={state.title}
          onChange={(e) => {
            setState((s) => ({ ...s, title: e.target.value }));
            clearErrors('title');
          }}
          error={errors.title}
          placeholder="e.g. 8-week strength foundation"
          maxLength={120}
        />
        {completion.done > 0 && (
          <div className={styles.completion}>
            <ProgressBar
              value={completion.done}
              max={completion.total}
              label={`${completion.done} of ${completion.total} days completed`}
              showValue
              tone="success"
            />
            <span className="sr-only">{pct}% complete</span>
          </div>
        )}
      </div>

      {errors.weeks && (
        <p className={styles.error} role="alert">
          {errors.weeks}
        </p>
      )}

      <ol className={styles.weeks}>
        {state.weeks.map((week, wi) => (
          <li key={week._key} className={styles.week}>
            <section aria-labelledby={`${week._key}-title`}>
              <header className={styles.weekHead}>
                <h3 id={`${week._key}-title`} className={styles.weekTitle}>
                  <span className={styles.weekNum}>W{wi + 1}</span>
                  Week {wi + 1}
                  <span className={styles.weekMeta}>
                    {week.days.length} day{week.days.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <div className={styles.weekActions}>
                  <Button size="sm" variant="ghost" icon="copy" onClick={() => duplicateWeek(wi)} aria-label={`Duplicate week ${wi + 1}`}>
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    iconOnly
                    onClick={() => removeWeek(wi)}
                    aria-label={`Remove week ${wi + 1}`}
                    disabled={state.weeks.length === 1}
                  />
                </div>
              </header>

              {week.days.length === 0 && <p className={styles.muted}>No days yet — add a training day.</p>}

              <div className={styles.days}>
                {week.days.map((day, di) => {
                  const base = `weeks.${wi}.days.${di}`;
                  const dayLabel = day.name.trim() || `day ${di + 1}`;
                  return (
                    <article key={day._key} className={`${styles.day} ${day.completed ? styles.dayDone : ''}`}>
                      <div className={styles.dayHead}>
                        <Input
                          className={styles.dayName}
                          label={`Week ${wi + 1}, day ${di + 1} name`}
                          hideLabel
                          value={day.name}
                          placeholder="e.g. Push day"
                          onChange={(e) => {
                            updateDay(wi, di, (d) => ({ ...d, name: e.target.value }));
                            clearErrors(`${base}.name`);
                          }}
                          error={errors[`${base}.name`]}
                        />
                        {day.completed && (
                          <Badge tone="success" size="sm" dot>
                            Completed
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="trash"
                          iconOnly
                          onClick={() => removeDay(wi, di)}
                          aria-label={`Remove ${dayLabel} from week ${wi + 1}`}
                        />
                      </div>

                      {day.exercises.length > 0 && (
                        <div className={styles.exHeader} aria-hidden="true">
                          <span>Exercise</span>
                          <span>Sets</span>
                          <span>Reps</span>
                          <span>Notes</span>
                          <span />
                        </div>
                      )}

                      <ul className={styles.exercises}>
                        {day.exercises.map((ex, ei) => {
                          const eb = `${base}.exercises.${ei}`;
                          const exLabel = ex.name.trim() || `exercise ${ei + 1}`;
                          return (
                            <li key={ex._key} className={styles.exRow}>
                              <Input
                                className={styles.exName}
                                label={`Exercise ${ei + 1} name`}
                                hideLabel
                                placeholder="e.g. Bench press"
                                value={ex.name}
                                onChange={(e) => {
                                  updateExercise(wi, di, ei, { name: e.target.value });
                                  clearErrors(`${eb}.name`);
                                }}
                                error={errors[`${eb}.name`]}
                              />
                              <Input
                                className={styles.exNum}
                                label={`Exercise ${ei + 1} sets`}
                                hideLabel
                                type="number"
                                min={1}
                                inputMode="numeric"
                                placeholder="Sets"
                                value={ex.sets}
                                onChange={(e) => {
                                  updateExercise(wi, di, ei, { sets: e.target.value });
                                  clearErrors(`${eb}.sets`);
                                }}
                                error={errors[`${eb}.sets`]}
                              />
                              <Input
                                className={styles.exNum}
                                label={`Exercise ${ei + 1} reps`}
                                hideLabel
                                type="number"
                                min={1}
                                inputMode="numeric"
                                placeholder="Reps"
                                value={ex.reps}
                                onChange={(e) => {
                                  updateExercise(wi, di, ei, { reps: e.target.value });
                                  clearErrors(`${eb}.reps`);
                                }}
                                error={errors[`${eb}.reps`]}
                              />
                              <Input
                                className={styles.exNotes}
                                label={`Exercise ${ei + 1} notes`}
                                hideLabel
                                placeholder="Notes (tempo, RPE…)"
                                value={ex.notes}
                                onChange={(e) => updateExercise(wi, di, ei, { notes: e.target.value })}
                                maxLength={200}
                              />
                              <div className={styles.exActions}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="chevronUp"
                                  iconOnly
                                  aria-label={`Move ${exLabel} up`}
                                  onClick={() => moveExercise(wi, di, ei, -1)}
                                  disabled={ei === 0}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="chevronDown"
                                  iconOnly
                                  aria-label={`Move ${exLabel} down`}
                                  onClick={() => moveExercise(wi, di, ei, 1)}
                                  disabled={ei === day.exercises.length - 1}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon="trash"
                                  iconOnly
                                  aria-label={`Remove ${exLabel}`}
                                  onClick={() => removeExercise(wi, di, ei)}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {errors[`${base}.exercises`] && (
                        <p className={styles.error} role="alert">
                          {errors[`${base}.exercises`]}
                        </p>
                      )}

                      <Button size="sm" variant="ghost" icon="plus" onClick={() => addExercise(wi, di)} className={styles.addEx}>
                        Add exercise
                      </Button>
                    </article>
                  );
                })}
              </div>

              <Button size="sm" variant="outline" icon="plus" onClick={() => addDay(wi)}>
                Add day
              </Button>
            </section>
          </li>
        ))}
      </ol>

      <Button variant="secondary" icon="plus" onClick={addWeek} className={styles.addWeek}>
        Add week
      </Button>

      <div className={styles.footer}>
        <p className={styles.footerNote}>
          <Icon name="info" size={16} />
          Your client sees changes as soon as you save.
        </p>
        <div className={styles.footerActions}>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button type="submit" icon="check" loading={saving}>
            {planId ? 'Save plan' : 'Create plan'}
          </Button>
        </div>
      </div>
    </form>
  );
}

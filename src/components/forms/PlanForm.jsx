import { useEffect, useRef, useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import Toggle from '../common/Toggle';
import { validate, planSchema } from '../../utils/validators';
import { CURRENCY } from '../../utils/constants';
import styles from '../../styles/PlanForm.module.css';

const DURATION_PRESETS = [
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
];

let featureSeq = 0;
const newFeature = (text = '') => ({ id: `f-${(featureSeq += 1)}`, text });

const toState = (plan) => ({
  name: plan?.name ?? '',
  price: plan?.price !== undefined && plan?.price !== null ? String(plan.price) : '',
  durationDays: plan?.durationDays ? String(plan.durationDays) : '30',
  active: plan?.active ?? true,
});

/**
 * Create / edit a membership plan.
 * Payload: { name, price, durationDays, features: string[], active }
 */
export default function PlanForm({ initialValues, onSubmit, onCancel, submitting = false, serverErrors }) {
  const [values, setValues] = useState(() => toState(initialValues));
  const [features, setFeatures] = useState(() => {
    const list = Array.isArray(initialValues?.features) ? initialValues.features : [];
    return list.length ? list.map((f) => newFeature(String(f))) : [newFeature()];
  });
  const [errors, setErrors] = useState({});
  const featureRefs = useRef({});
  const focusId = useRef(null);

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) setErrors((e) => ({ ...e, ...serverErrors }));
  }, [serverErrors]);

  useEffect(() => {
    if (focusId.current && featureRefs.current[focusId.current]) {
      featureRefs.current[focusId.current].focus();
      focusId.current = null;
    }
  }, [features]);

  const setField = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const clearFeatureError = () => setErrors((e) => (e.features ? { ...e, features: undefined } : e));

  const updateFeature = (id, text) => {
    setFeatures((list) => list.map((f) => (f.id === id ? { ...f, text } : f)));
    clearFeatureError();
  };

  const addFeature = (afterIndex) => {
    const item = newFeature();
    focusId.current = item.id;
    setFeatures((list) => {
      const next = [...list];
      next.splice(afterIndex === undefined ? next.length : afterIndex + 1, 0, item);
      return next;
    });
  };

  const removeFeature = (id) => {
    setFeatures((list) => (list.length <= 1 ? [newFeature()] : list.filter((f) => f.id !== id)));
    clearFeatureError();
  };

  const moveFeature = (index, dir) => {
    setFeatures((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleFeatureKey = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature(index);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanFeatures = features.map((f) => f.text.trim()).filter(Boolean);
    const nextErrors = validate(values, planSchema);
    if (!cleanFeatures.length) nextErrors.features = 'Add at least one feature';
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    await onSubmit?.({
      name: values.name.trim(),
      price: Number(values.price),
      durationDays: Number(values.durationDays),
      features: cleanFeatures,
      active: Boolean(values.active),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Plan name"
        name="name"
        required
        value={values.name}
        onChange={(e) => setField('name', e.target.value)}
        error={errors.name}
        placeholder="e.g. Pro Monthly"
        data-autofocus
      />

      <div className={styles.row}>
        <Input
          label="Price"
          name="price"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          value={values.price}
          onChange={(e) => setField('price', e.target.value)}
          error={errors.price}
          suffix={CURRENCY}
        />
        <Input
          label="Duration"
          name="durationDays"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          value={values.durationDays}
          onChange={(e) => setField('durationDays', e.target.value)}
          error={errors.durationDays}
          suffix="days"
        />
      </div>

      <div className={styles.presets} role="group" aria-label="Duration presets">
        {DURATION_PRESETS.map((p) => {
          const selected = Number(values.durationDays) === p.days;
          return (
            <button
              key={p.days}
              type="button"
              className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
              aria-pressed={selected}
              onClick={() => setField('durationDays', String(p.days))}
            >
              {p.days}d · {p.label}
            </button>
          );
        })}
      </div>

      <fieldset className={styles.features}>
        <legend className={styles.legend}>
          Features <span className={styles.legendHint}>Press Enter to add another</span>
        </legend>
        <ul className={styles.featureList}>
          {features.map((f, i) => (
            <li key={f.id} className={styles.featureItem}>
              <span className={styles.featureIndex} aria-hidden="true">
                {i + 1}
              </span>
              <input
                ref={(el) => {
                  if (el) featureRefs.current[f.id] = el;
                  else delete featureRefs.current[f.id];
                }}
                className={styles.featureInput}
                value={f.text}
                onChange={(e) => updateFeature(f.id, e.target.value)}
                onKeyDown={(e) => handleFeatureKey(e, i)}
                placeholder="e.g. Unlimited group classes"
                aria-label={`Feature ${i + 1}`}
                aria-invalid={errors.features ? true : undefined}
              />
              <div className={styles.featureActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon="chevronUp"
                  aria-label={`Move feature ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => moveFeature(i, -1)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon="chevronDown"
                  aria-label={`Move feature ${i + 1} down`}
                  disabled={i === features.length - 1}
                  onClick={() => moveFeature(i, 1)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon="trash"
                  aria-label={`Remove feature ${i + 1}`}
                  onClick={() => removeFeature(f.id)}
                />
              </div>
            </li>
          ))}
        </ul>
        {errors.features && (
          <p className={styles.error} role="alert">
            {errors.features}
          </p>
        )}
        <Button variant="outline" size="sm" icon="plus" onClick={() => addFeature()}>
          Add feature
        </Button>
      </fieldset>

      <Toggle
        checked={values.active}
        onChange={(v) => setField('active', v)}
        label="Active"
        description="Inactive plans are hidden from members but existing memberships continue."
      />

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {initialValues?._id ? 'Save changes' : 'Create plan'}
        </Button>
      </div>
    </form>
  );
}

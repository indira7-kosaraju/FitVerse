import { useEffect, useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validate, hasErrors, progressSchema } from '../../utils/validators';
import { toISODate } from '../../utils/formatDate';
import styles from '../../styles/ProgressForm.module.css';

const MEASUREMENTS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'thighs', label: 'Thighs' },
];

const initialValues = () => ({
  date: toISODate(new Date()),
  weightKg: '',
  bodyFatPct: '',
  chest: '',
  waist: '',
  hips: '',
  arms: '',
  thighs: '',
});

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/** Builds the API payload: numbers only, blanks omitted. */
function toPayload(values) {
  const measurements = {};
  MEASUREMENTS.forEach(({ key }) => {
    if (!isBlank(values[key])) measurements[key] = Number(values[key]);
  });
  const [y, m, d] = values.date.split('-').map(Number);
  // Noon local time avoids the date shifting across timezones.
  const date = new Date(y, m - 1, d, 12, 0, 0).toISOString();
  return {
    date,
    weightKg: Number(values.weightKg),
    bodyFatPct: isBlank(values.bodyFatPct) ? undefined : Number(values.bodyFatPct),
    measurements,
  };
}

export default function ProgressForm({ onSubmit, onCancel, submitting = false, serverErrors }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) {
      // Map nested keys like "measurements.chest" to the flat field name.
      const mapped = {};
      Object.entries(serverErrors).forEach(([k, msg]) => {
        mapped[k.replace(/^measurements\./, '')] = msg;
      });
      setErrors((e) => ({ ...e, ...mapped }));
    }
  }, [serverErrors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(values, progressSchema);
    if (values.date && values.date > toISODate(new Date())) nextErrors.date = 'Date cannot be in the future';
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    try {
      await onSubmit?.(toPayload(values));
    } catch {
      // parent handles toast + serverErrors
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <Input
          label="Date"
          type="date"
          name="date"
          value={values.date}
          onChange={handleChange}
          error={errors.date}
          max={toISODate(new Date())}
          required
        />
        <Input
          label="Weight"
          type="number"
          name="weightKg"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="400"
          suffix="kg"
          value={values.weightKg}
          onChange={handleChange}
          error={errors.weightKg}
          required
        />
        <Input
          label="Body fat"
          type="number"
          name="bodyFatPct"
          inputMode="decimal"
          step="0.1"
          min="2"
          max="70"
          suffix="%"
          value={values.bodyFatPct}
          onChange={handleChange}
          error={errors.bodyFatPct}
          hint="Optional"
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Measurements <span>(optional)</span></legend>
        <div className={styles.grid}>
          {MEASUREMENTS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              name={key}
              inputMode="decimal"
              step="0.1"
              min="0"
              suffix="cm"
              value={values[key]}
              onChange={handleChange}
              error={errors[key]}
            />
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" icon="check" loading={submitting}>
          Save entry
        </Button>
      </div>
    </form>
  );
}

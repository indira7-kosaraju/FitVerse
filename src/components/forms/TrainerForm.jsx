import { useState } from 'react';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { SPECIALIZATIONS } from '../../utils/constants';
import { rules, validate, hasErrors } from '../../utils/validators';
import styles from '../../styles/TrainerForm.module.css';

const baseSchema = {
  name: [rules.required('Name is required'), rules.minLength(2), rules.maxLength(80)],
  phone: [rules.phone()],
  bio: [rules.maxLength(600)],
};

const createSchema = {
  ...baseSchema,
  email: [rules.required('Email is required'), rules.email()],
  password: [rules.required('Password is required'), rules.password()],
};

/**
 * Add / edit a trainer.
 * mode: 'create' | 'edit'
 * onSubmit(payload) => Promise — rejection is shown inline + as a toast; success handled by caller.
 */
export default function TrainerForm({ mode = 'create', initialValues, onSubmit, onCancel }) {
  const isCreate = mode === 'create';
  const [values, setValues] = useState(() => ({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: initialValues?.phone || '',
    password: '',
    bio: initialValues?.bio || '',
    specializations: Array.isArray(initialValues?.specializations) ? initialValues.specializations : [],
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const toggleSpec = (spec) =>
    set(
      'specializations',
      values.specializations.includes(spec)
        ? values.specializations.filter((s) => s !== spec)
        : [...values.specializations, spec]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate(values, isCreate ? createSchema : baseSchema);
    setErrors(v);
    if (hasErrors(v)) return;

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      specializations: values.specializations,
      bio: values.bio.trim(),
    };
    if (isCreate) {
      payload.email = values.email.trim().toLowerCase();
      payload.password = values.password;
      payload.role = 'trainer';
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...getFieldErrors(err) }));
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Keep any legacy specializations the trainer already has, even if not in the preset list.
  const options = Array.from(new Set([...SPECIALIZATIONS, ...values.specializations]));

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.row}>
        <Input
          label="Full name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          required
          autoComplete="name"
          data-autofocus
        />
        <Input
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={errors.phone}
          autoComplete="tel"
        />
      </div>

      {isCreate ? (
        <div className={styles.row}>
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
            required
            autoComplete="off"
          />
          <Input
            label="Temporary password"
            type="password"
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
            hint="8+ characters with a letter and a number"
            required
            autoComplete="new-password"
          />
        </div>
      ) : (
        initialValues?.email && (
          <p className={styles.readonly}>
            <Icon name="mail" size={16} /> {initialValues.email}
          </p>
        )
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Specializations</legend>
        <div className={styles.chips}>
          {options.map((spec) => {
            const on = values.specializations.includes(spec);
            return (
              <button
                key={spec}
                type="button"
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                aria-pressed={on}
                onClick={() => toggleSpec(spec)}
              >
                {on && <Icon name="check" size={14} />}
                {spec}
              </button>
            );
          })}
        </div>
        {errors.specializations && (
          <p className={styles.error} role="alert">
            {errors.specializations}
          </p>
        )}
      </fieldset>

      <Input
        as="textarea"
        label="Bio"
        rows={4}
        value={values.bio}
        onChange={(e) => set('bio', e.target.value)}
        error={errors.bio}
        hint={`${values.bio.length}/600`}
        placeholder="Coaching style, certifications, experience…"
      />

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} icon={isCreate ? 'plus' : 'check'}>
          {isCreate ? 'Add trainer' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

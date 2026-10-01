import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { validate, hasErrors, registerSchema } from '../../utils/validators';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/AuthForms.module.css';

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_TONES = ['danger', 'danger', 'warning', 'info', 'success'];

/** 0–4 score: length, mixed case, digit, symbol, long length. */
export function scorePassword(pw = '') {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (pw.length >= 12) score += 1;
  if (pw.length < 8) score = Math.min(score, 1);
  return Math.min(4, score);
}

/** Segmented strength meter for password inputs. */
export function PasswordStrength({ password }) {
  const score = useMemo(() => scorePassword(password), [password]);
  if (!password) return null;
  const tone = STRENGTH_TONES[score];
  return (
    <div className={styles.strength} data-tone={tone}>
      <div className={styles.strengthBars} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < Math.max(1, score) ? styles.on : ''} />
        ))}
      </div>
      <p className={styles.strengthLabel} aria-live="polite">
        Password strength: <strong>{STRENGTH_LABELS[score]}</strong>
      </p>
    </div>
  );
}

const schema = {
  ...registerSchema,
  terms: [(v) => (v ? undefined : 'You must accept the terms to continue')],
};

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(values, schema);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      };
      if (values.phone.trim()) payload.phone = values.phone.trim();
      const user = await register(payload);
      toast.success(`Welcome to FitVerse, ${user?.name?.split(' ')[0] || 'champ'}!`);
      navigate(ROLE_HOME[user?.role] || ROLE_HOME.member, { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors((er) => ({ ...er, ...fieldErrors }));
      setFormError(getErrorMessage(err, 'Unable to create your account. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className={styles.banner} role="alert">
          <Icon name="alert" size={18} />
          <span>{formError}</span>
        </div>
      )}

      <Input
        label="Full name"
        name="name"
        icon="user"
        autoComplete="name"
        placeholder="Alex Morgan"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        required
        autoFocus
      />

      <div className={styles.row}>
        <Input
          label="Email"
          name="email"
          type="email"
          icon="mail"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          required
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          icon="phone"
          autoComplete="tel"
          placeholder="Optional"
          value={values.phone}
          onChange={handleChange}
          error={errors.phone}
        />
      </div>

      <div className={styles.stack}>
        <Input
          label="Password"
          name="password"
          type="password"
          icon="lock"
          autoComplete="new-password"
          placeholder="8+ characters"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          hint="Use 8+ characters with a letter and a number."
          required
        />
        <PasswordStrength password={values.password} />
      </div>

      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        icon="lock"
        autoComplete="new-password"
        placeholder="Repeat your password"
        value={values.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
      />

      <div className={styles.checkField}>
        <label className={`${styles.check} ${errors.terms ? styles.checkInvalid : ''}`}>
          <input
            type="checkbox"
            name="terms"
            checked={values.terms}
            onChange={handleChange}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? 'terms-error' : undefined}
            required
          />
          <span className={styles.checkBox} aria-hidden="true">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
          <span>
            I agree to the <Link to="/#terms">Terms of Service</Link> and <Link to="/#privacy">Privacy Policy</Link>.
          </span>
        </label>
        {errors.terms && (
          <p id="terms-error" className={styles.fieldError} role="alert">
            {errors.terms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" fullWidth loading={submitting} iconRight="arrowRight">
        Create account
      </Button>
    </form>
  );
}

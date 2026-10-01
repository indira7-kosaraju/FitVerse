import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import { forgotPassword } from '../../api/authApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { validate, hasErrors, forgotPasswordSchema } from '../../utils/validators';
import styles from '../../styles/AuthForms.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) setErrors({});
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate({ email }, forgotPasswordSchema);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const trimmed = email.trim();
    setSubmitting(true);
    setFormError('');
    try {
      await forgotPassword(trimmed);
      setSentTo(trimmed);
      toast.success('If that account exists, a reset link is on its way.');
    } catch (err) {
      // Never reveal whether an email is registered: treat "not found" as success.
      if (err?.response?.status === 404) {
        setSentTo(trimmed);
        toast.success('If that account exists, a reset link is on its way.');
      } else {
        const fieldErrors = getFieldErrors(err);
        setErrors(fieldErrors);
        const message = getErrorMessage(err);
        setFormError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSentTo('');
    setEmail('');
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title={sentTo ? 'Check your inbox' : 'Forgot your password?'}
      subtitle={
        sentTo
          ? undefined
          : "No sweat. Enter the email you signed up with and we'll send you a link to reset it."
      }
      docTitle="Forgot password"
      footer={
        <p>
          Remembered it? <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      {sentTo ? (
        <div className={styles.success} aria-live="polite">
          <span className={styles.successIcon}>
            <Icon name="mail" size={32} />
          </span>
          <p className={styles.successText}>
            If an account exists for <strong>{sentTo}</strong>, you&apos;ll receive an email with a reset link
            shortly. The link expires soon, so use it while it&apos;s fresh.
          </p>
          <p className={styles.successText}>
            Didn&apos;t get it? Check your spam folder or{' '}
            <button type="button" className={styles.linkBtn} onClick={reset}>
              try another email
            </button>
            .
          </p>
          <div className={styles.actions}>
            <Button to="/login" size="lg" fullWidth icon="logIn">
              Back to log in
            </Button>
          </div>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className={styles.banner} role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </div>
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            icon="mail"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleChange}
            error={errors.email}
            required
            autoFocus
          />
          <Button type="submit" size="lg" fullWidth loading={submitting} iconRight="arrowRight">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

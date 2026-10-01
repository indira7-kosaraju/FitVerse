import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../common/Input';
import Button from '../common/Button';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { validate, hasErrors, loginSchema } from '../../utils/validators';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/AuthForms.module.css';

/** Returns the remembered destination only if it belongs to the user's own role area. */
function resolveDestination(from, role) {
  const home = ROLE_HOME[role] || '/';
  const path = from?.pathname;
  if (path && home !== '/' && (path === home || path.startsWith(`${home}/`))) {
    return `${path}${from.search || ''}${from.hash || ''}`;
  }
  return home;
}

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(values, loginSchema);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login({ email: values.email.trim(), password: values.password });
      const firstName = user?.name?.split(' ')[0];
      toast.success(firstName ? `Welcome back, ${firstName}!` : 'Welcome back!');
      navigate(resolveDestination(location.state?.from, user?.role), { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors((er) => ({ ...er, ...fieldErrors }));
      setFormError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
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
        autoFocus
      />

      <div className={styles.passwordField}>
        <Input
          label="Password"
          name="password"
          type="password"
          icon="lock"
          autoComplete="current-password"
          placeholder="Your password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          required
        />
        <Link to="/forgot-password" className={styles.forgot}>
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" fullWidth loading={submitting} iconRight="arrowRight">
        Log in
      </Button>
    </form>
  );
}

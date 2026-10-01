import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import { PasswordStrength } from '../../components/forms/RegisterForm';
import { resetPassword } from '../../api/authApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { validate, hasErrors, resetPasswordSchema } from '../../utils/validators';
import styles from '../../styles/AuthForms.module.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState({ password: '', confirmPassword: '' });
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
    const nextErrors = validate(values, resetPasswordSchema);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      await resetPassword(token, values.password);
      toast.success('Password updated. Log in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors((er) => ({ ...er, ...fieldErrors }));
      const message = getErrorMessage(err, 'This reset link is invalid or has expired.');
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Set a new password"
      subtitle="Make it strong — you lift heavy, your password should too."
      docTitle="Reset password"
      footer={
        <p>
          Link expired? <Link to="/forgot-password">Request a new one</Link>
        </p>
      }
    >
      {!token ? (
        <div className={styles.banner} role="alert">
          <Icon name="alert" size={18} />
          <span>
            This reset link is missing its token. <Link to="/forgot-password">Request a new link</Link>.
          </span>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <input type="text" name="username" autoComplete="username" value="" readOnly hidden />
          {formError && (
            <div className={styles.banner} role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.stack}>
            <Input
              label="New password"
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
              autoFocus
            />
            <PasswordStrength password={values.password} />
          </div>

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            icon="lock"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={values.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" size="lg" fullWidth loading={submitting} icon="check">
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

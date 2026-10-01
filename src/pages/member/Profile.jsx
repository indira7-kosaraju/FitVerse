import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import FileUpload from '../../components/common/FileUpload';
import Icon from '../../components/common/Icon';
import Input from '../../components/common/Input';
import Toggle from '../../components/common/Toggle';
import useAuth from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { changePassword, updateMe, uploadAvatar } from '../../api/authApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { validate, hasErrors, rules, profileSchema, changePasswordSchema } from '../../utils/validators';
import { ROLES, SPECIALIZATIONS } from '../../utils/constants';
import styles from '../../styles/Profile.module.css';

const BIO_MAX = 500;

const emergencySchema = {
  name: [rules.custom((v, all) => !(all.phone && String(all.phone).trim()) || (v && String(v).trim()), 'Name is required when a phone is given')],
  phone: [rules.phone()],
  relation: [rules.maxLength(50)],
};

const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Responses may be the User, `{ user }` or `{ data }` — normalise to an object. */
const asUser = (res) => (res && typeof res === 'object' ? res.user || res : null);

export default function Profile() {
  const { user, role, updateUser } = useAuth();
  const { isDark, setTheme } = useTheme();
  const isTrainer = role === ROLES.TRAINER;
  const isMember = role === ROLES.MEMBER;

  /* ---------- Avatar ---------- */
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);

  const handleAvatarUpload = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const res = await uploadAvatar(file, (evt) => {
        if (evt.total) setAvatarProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      const avatarUrl = asUser(res)?.avatarUrl;
      if (avatarUrl) updateUser({ avatarUrl });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setAvatarUploading(false);
    }
  };

  /* ---------- Personal info ---------- */
  const [info, setInfo] = useState({ name: '', phone: '', bio: '', specializations: [] });
  const [infoErrors, setInfoErrors] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  /* ---------- Emergency contact ---------- */
  const [emergency, setEmergency] = useState({ name: '', phone: '', relation: '' });
  const [emergencyErrors, setEmergencyErrors] = useState({});
  const [savingEmergency, setSavingEmergency] = useState(false);

  useEffect(() => {
    if (!user) return;
    setInfo({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      specializations: Array.isArray(user.specializations) ? user.specializations : [],
    });
    setEmergency({
      name: user.emergencyContact?.name || '',
      phone: user.emergencyContact?.phone || '',
      relation: user.emergencyContact?.relation || '',
    });
    // Only re-seed when the signed-in user changes, not on every local update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const changeInfo = (e) => {
    const { name, value } = e.target;
    setInfo((v) => ({ ...v, [name]: value }));
    if (infoErrors[name]) setInfoErrors((er) => ({ ...er, [name]: undefined }));
  };

  const toggleSpec = (spec) => {
    setInfo((v) => ({
      ...v,
      specializations: v.specializations.includes(spec)
        ? v.specializations.filter((s) => s !== spec)
        : [...v.specializations, spec],
    }));
    if (infoErrors.specializations) setInfoErrors((er) => ({ ...er, specializations: undefined }));
  };

  const submitInfo = async (e) => {
    e.preventDefault();
    const errs = validate(info, profileSchema);
    setInfoErrors(errs);
    if (hasErrors(errs)) return;
    const payload = { name: info.name.trim(), phone: info.phone.trim() };
    if (isTrainer) {
      payload.bio = info.bio.trim();
      payload.specializations = info.specializations;
    }
    setSavingInfo(true);
    try {
      const res = await updateMe(payload);
      updateUser(asUser(res) || payload);
      toast.success('Profile updated');
    } catch (err) {
      setInfoErrors((er) => ({ ...er, ...getFieldErrors(err) }));
      toast.error(getErrorMessage(err));
    } finally {
      setSavingInfo(false);
    }
  };

  const changeEmergency = (e) => {
    const { name, value } = e.target;
    setEmergency((v) => ({ ...v, [name]: value }));
    if (emergencyErrors[name]) setEmergencyErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submitEmergency = async (e) => {
    e.preventDefault();
    const errs = validate(emergency, emergencySchema);
    setEmergencyErrors(errs);
    if (hasErrors(errs)) return;
    const emergencyContact = {
      name: emergency.name.trim(),
      phone: emergency.phone.trim(),
      relation: emergency.relation.trim(),
    };
    setSavingEmergency(true);
    try {
      const res = await updateMe({ emergencyContact });
      updateUser(asUser(res) || { emergencyContact });
      toast.success('Emergency contact saved');
    } catch (err) {
      const fe = getFieldErrors(err);
      const mapped = {};
      Object.entries(fe).forEach(([k, msg]) => {
        mapped[k.replace(/^emergencyContact\./, '')] = msg;
      });
      setEmergencyErrors((er) => ({ ...er, ...mapped }));
      toast.error(getErrorMessage(err));
    } finally {
      setSavingEmergency(false);
    }
  };

  /* ---------- Password ---------- */
  const [pw, setPw] = useState(emptyPassword);
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const changePw = (e) => {
    const { name, value } = e.target;
    setPw((v) => ({ ...v, [name]: value }));
    if (pwErrors[name]) setPwErrors((er) => ({ ...er, [name]: undefined }));
  };

  const submitPw = async (e) => {
    e.preventDefault();
    const errs = validate(pw, changePasswordSchema);
    setPwErrors(errs);
    if (hasErrors(errs)) return;
    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw(emptyPassword);
      setPwErrors({});
      toast.success('Password changed');
    } catch (err) {
      const fe = getFieldErrors(err);
      if (fe.password && !fe.newPassword) fe.newPassword = fe.password;
      setPwErrors((er) => ({ ...er, ...fe }));
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Account" title="Profile" subtitle="Manage your personal details, security and preferences." />

      <div className={styles.layout}>
        <div className={styles.aside}>
          {/* (a) Avatar */}
          <Card title="Profile photo" subtitle="JPG, PNG or WebP up to 5 MB">
            <div className={styles.avatarBlock}>
              <Avatar src={user?.avatarUrl} name={user?.name} size={112} ring />
              <div className={styles.identity}>
                <p className={styles.userName}>{user?.name}</p>
                <p className={styles.userEmail}>{user?.email}</p>
                {roleLabel && (
                  <Badge tone="primary" size="sm">
                    {roleLabel}
                  </Badge>
                )}
              </div>
            </div>
            <FileUpload
              label="Change photo"
              accept="image/*"
              maxSizeMB={5}
              onUpload={handleAvatarUpload}
              uploading={avatarUploading}
              progress={avatarProgress}
              compact
            />
          </Card>

          {/* (e) Preferences */}
          <Card title="Preferences">
            <Toggle
              checked={isDark}
              onChange={(on) => setTheme(on ? 'dark' : 'light')}
              label="Dark mode"
              description="Easier on the eyes for late-night sessions."
            />
          </Card>
        </div>

        <div className={styles.main}>
          {/* (b) Personal info */}
          <Card title="Personal information" subtitle="This is how you appear to trainers and staff.">
            <form className={styles.form} onSubmit={submitInfo} noValidate>
              <div className={styles.twoCol}>
                <Input label="Full name" name="name" value={info.name} onChange={changeInfo} error={infoErrors.name} autoComplete="name" required />
                <Input
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={info.phone}
                  onChange={changeInfo}
                  error={infoErrors.phone}
                  autoComplete="tel"
                  icon="phone"
                />
              </div>
              <Input
                label="Email"
                name="email"
                type="email"
                value={user?.email || ''}
                readOnly
                icon="mail"
                hint="Contact support to change your email address."
              />

              {isTrainer && (
                <>
                  <div className={styles.bioWrap}>
                    <Input
                      as="textarea"
                      label="Bio"
                      name="bio"
                      rows={5}
                      maxLength={BIO_MAX}
                      value={info.bio}
                      onChange={changeInfo}
                      error={infoErrors.bio}
                      placeholder="Tell members about your coaching style, certifications and experience."
                    />
                    <p className={`${styles.counter} ${info.bio.length >= BIO_MAX ? styles.counterMax : ''}`} aria-live="polite">
                      {info.bio.length}/{BIO_MAX}
                    </p>
                  </div>

                  <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>Specializations</legend>
                    <ul className={styles.chips}>
                      {SPECIALIZATIONS.map((spec) => {
                        const on = info.specializations.includes(spec);
                        return (
                          <li key={spec}>
                            <button
                              type="button"
                              className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                              aria-pressed={on}
                              onClick={() => toggleSpec(spec)}
                            >
                              {on && <Icon name="check" size={14} />}
                              {spec}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {infoErrors.specializations && (
                      <p className={styles.error} role="alert">
                        {infoErrors.specializations}
                      </p>
                    )}
                  </fieldset>
                </>
              )}

              <div className={styles.actions}>
                <Button type="submit" icon="check" loading={savingInfo}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          {/* (c) Emergency contact */}
          {isMember && (
            <Card title="Emergency contact" subtitle="Who should we call if something happens at the gym?">
              <form className={styles.form} onSubmit={submitEmergency} noValidate>
                <div className={styles.threeCol}>
                  <Input
                    label="Contact name"
                    name="name"
                    value={emergency.name}
                    onChange={changeEmergency}
                    error={emergencyErrors.name}
                    autoComplete="off"
                  />
                  <Input
                    label="Contact phone"
                    name="phone"
                    type="tel"
                    value={emergency.phone}
                    onChange={changeEmergency}
                    error={emergencyErrors.phone}
                    autoComplete="off"
                  />
                  <Input
                    label="Relation"
                    name="relation"
                    value={emergency.relation}
                    onChange={changeEmergency}
                    error={emergencyErrors.relation}
                    placeholder="e.g. Partner"
                  />
                </div>
                <div className={styles.actions}>
                  <Button type="submit" variant="secondary" icon="shield" loading={savingEmergency}>
                    Save contact
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* (d) Change password */}
          <Card title="Change password" subtitle="Use 8+ characters with at least one letter and one number.">
            <form className={styles.form} onSubmit={submitPw} noValidate>
              <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly hidden />
              <Input
                label="Current password"
                name="currentPassword"
                type="password"
                value={pw.currentPassword}
                onChange={changePw}
                error={pwErrors.currentPassword}
                autoComplete="current-password"
                required
              />
              <div className={styles.twoCol}>
                <Input
                  label="New password"
                  name="newPassword"
                  type="password"
                  value={pw.newPassword}
                  onChange={changePw}
                  error={pwErrors.newPassword}
                  autoComplete="new-password"
                  required
                />
                <Input
                  label="Confirm new password"
                  name="confirmPassword"
                  type="password"
                  value={pw.confirmPassword}
                  onChange={changePw}
                  error={pwErrors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className={styles.actions}>
                <Button type="submit" icon="lock" loading={savingPw}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

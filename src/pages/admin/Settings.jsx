import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Toggle from '../../components/common/Toggle';
import Badge from '../../components/common/Badge';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonCard } from '../../components/common/Skeleton';
import useFetch from '../../hooks/useFetch';
import { getSettings, updateSettings } from '../../api/adminApi';
import { getErrorMessage, getFieldErrors } from '../../api/axios';
import { WEEKDAYS } from '../../utils/constants';
import { rules, validate } from '../../utils/validators';
import styles from '../../styles/Settings.module.css';

const CURRENCIES = [
  { value: 'USD', label: 'USD — US dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British pound' },
  { value: 'INR', label: 'INR — Indian rupee' },
];

const DAY_NAMES = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const DEFAULTS = {
  gymName: 'FitVerse',
  email: '',
  phone: '',
  address: '',
  website: '',
  currency: 'USD',
  hours: WEEKDAYS.map((day) => ({
    day,
    open: day !== 'Sun',
    from: day === 'Sat' || day === 'Sun' ? '08:00' : '06:00',
    to: day === 'Sat' || day === 'Sun' ? '18:00' : '22:00',
  })),
  policies: { cancelWindowHours: 2, maxWeeklyBookings: 5, waitlist: true },
};

const TIME_RE = /^\d{2}:\d{2}/;
const cleanTime = (v, fallback) => (typeof v === 'string' && TIME_RE.test(v) ? v.slice(0, 5) : fallback);

/** Merges whatever the API returns onto the defaults so every field exists. */
function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const hoursIn = Array.isArray(s.hours) ? s.hours : [];
  const policies = s.policies && typeof s.policies === 'object' ? s.policies : {};
  return {
    gymName: s.gymName ?? DEFAULTS.gymName,
    email: s.email ?? '',
    phone: s.phone ?? '',
    address: s.address ?? '',
    website: s.website ?? '',
    currency: CURRENCIES.some((c) => c.value === s.currency) ? s.currency : DEFAULTS.currency,
    hours: DEFAULTS.hours.map((def) => {
      const found = hoursIn.find((h) => String(h?.day).slice(0, 3).toLowerCase() === def.day.toLowerCase());
      return found
        ? {
            day: def.day,
            open: Boolean(found.open),
            from: cleanTime(found.from, def.from),
            to: cleanTime(found.to, def.to),
          }
        : { ...def };
    }),
    policies: {
      cancelWindowHours: String(policies.cancelWindowHours ?? DEFAULTS.policies.cancelWindowHours),
      maxWeeklyBookings: String(policies.maxWeeklyBookings ?? DEFAULTS.policies.maxWeeklyBookings),
      waitlist: policies.waitlist ?? DEFAULTS.policies.waitlist,
    },
  };
}

const infoSchema = {
  gymName: [rules.required('Gym name is required'), rules.minLength(2)],
  email: [rules.required('Contact email is required'), rules.email()],
  phone: [rules.phone()],
  website: [rules.url('Enter a full URL, e.g. https://fitverse.com')],
  currency: [rules.required('Currency is required')],
};

function validateSettings(values) {
  const errors = validate(values, infoSchema);
  values.hours.forEach((h, i) => {
    if (!h.open) return;
    if (!h.from || !h.to) errors[`hours.${i}`] = 'Set opening and closing times';
    else if (h.to <= h.from) errors[`hours.${i}`] = 'Closing time must be after opening time';
  });
  const policyErrors = validate(values.policies, {
    cancelWindowHours: [rules.required('Required'), rules.number({ min: 0, max: 168, integer: true })],
    maxWeeklyBookings: [rules.required('Required'), rules.number({ min: 1, max: 50, integer: true })],
  });
  Object.entries(policyErrors).forEach(([k, v]) => {
    errors[`policies.${k}`] = v;
  });
  return errors;
}

const toPayload = (v) => ({
  gymName: v.gymName.trim(),
  email: v.email.trim(),
  phone: v.phone.trim(),
  address: v.address.trim(),
  website: v.website.trim(),
  currency: v.currency,
  hours: v.hours.map((h) => ({ day: h.day, open: h.open, from: h.from, to: h.to })),
  policies: {
    cancelWindowHours: Number(v.policies.cancelWindowHours),
    maxWeeklyBookings: Number(v.policies.maxWeeklyBookings),
    waitlist: Boolean(v.policies.waitlist),
  },
});

export default function Settings() {
  const { data, loading, error, refetch } = useFetch(
    () =>
      getSettings()
        .then((res) => ({ settings: res, isNew: !res }))
        .catch((err) => {
          if (err.response?.status === 404) return { settings: null, isNew: true };
          throw err;
        }),
    []
  );

  const [initial, setInitial] = useState(null);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next = normalize(data.settings);
    setInitial(next);
    setValues(next);
    setErrors({});
  }, [data]);

  const dirty = useMemo(
    () => Boolean(initial && values) && JSON.stringify(initial) !== JSON.stringify(values),
    [initial, values]
  );

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const clearError = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const setField = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    clearError(key);
  };

  const setHour = (index, patch) => {
    setValues((v) => ({ ...v, hours: v.hours.map((h, i) => (i === index ? { ...h, ...patch } : h)) }));
    clearError(`hours.${index}`);
  };

  const setPolicy = (key, value) => {
    setValues((v) => ({ ...v, policies: { ...v.policies, [key]: value } }));
    clearError(`policies.${key}`);
  };

  const copyToWeekdays = (index) => {
    const src = values.hours[index];
    setValues((v) => ({
      ...v,
      hours: v.hours.map((h, i) => (i < 5 ? { ...h, open: src.open, from: src.from, to: src.to } : h)),
    }));
    setErrors((e) => {
      const next = { ...e };
      for (let i = 0; i < 5; i += 1) delete next[`hours.${i}`];
      return next;
    });
  };

  const handleReset = () => {
    setValues(initial);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateSettings(values);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(values);
      const saved = await updateSettings(payload);
      const next = normalize(saved && typeof saved === 'object' ? { ...payload, ...saved } : payload);
      setInitial(next);
      setValues(next);
      setErrors({});
      toast.success('Settings saved');
    } catch (err) {
      setErrors((prev) => ({ ...prev, ...getFieldErrors(err) }));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <PageHeader
      eyebrow="Admin"
      title="Settings"
      subtitle="Gym details, opening hours and booking rules."
      actions={
        dirty ? (
          <Badge tone="warning" dot>
            Unsaved changes
          </Badge>
        ) : null
      }
    />
  );

  if (error) {
    return (
      <div className={styles.page}>
        {header}
        <ErrorState message={error} onRetry={refetch} />
      </div>
    );
  }

  if (loading || !values) {
    return (
      <div className={styles.page} role="status" aria-label="Loading settings">
        {header}
        <SkeletonCard lines={5} />
        <SkeletonCard lines={7} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {header}

      {data?.isNew && (
        <p className={styles.notice}>
          No settings saved yet — these are sensible defaults. Review them and save to get started.
        </p>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Card title="Gym information" subtitle="Shown on invoices, emails and the public site.">
          <div className={styles.grid}>
            <Input
              label="Gym name"
              required
              value={values.gymName}
              onChange={(e) => setField('gymName', e.target.value)}
              error={errors.gymName}
            />
            <Input
              label="Contact email"
              type="email"
              required
              icon="mail"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
              error={errors.email}
            />
            <Input
              label="Phone"
              type="tel"
              icon="phone"
              value={values.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={errors.phone}
            />
            <Input
              label="Website"
              type="url"
              placeholder="https://"
              value={values.website}
              onChange={(e) => setField('website', e.target.value)}
              error={errors.website}
            />
            <Input
              label="Address"
              icon="mapPin"
              className={styles.span2}
              value={values.address}
              onChange={(e) => setField('address', e.target.value)}
              error={errors.address}
            />
            <Select
              label="Currency"
              options={CURRENCIES}
              value={values.currency}
              onChange={(e) => setField('currency', e.target.value)}
              error={errors.currency}
            />
          </div>
        </Card>

        <Card title="Opening hours" subtitle="Members can only book classes while the gym is open.">
          <ul className={styles.hours}>
            {values.hours.map((h, i) => {
              const err = errors[`hours.${i}`];
              return (
                <li key={h.day} className={`${styles.hourRow} ${h.open ? '' : styles.closed}`}>
                  <div className={styles.dayCell}>
                    <Toggle
                      checked={h.open}
                      onChange={(open) => setHour(i, { open })}
                      label={DAY_NAMES[h.day] || h.day}
                      description={h.open ? 'Open' : 'Closed'}
                    />
                  </div>
                  <div className={styles.times}>
                    <Input
                      label={`${DAY_NAMES[h.day]} opens`}
                      hideLabel
                      type="time"
                      value={h.from}
                      disabled={!h.open}
                      onChange={(e) => setHour(i, { from: e.target.value })}
                      aria-invalid={err ? true : undefined}
                    />
                    <span className={styles.dash} aria-hidden="true">
                      –
                    </span>
                    <Input
                      label={`${DAY_NAMES[h.day]} closes`}
                      hideLabel
                      type="time"
                      value={h.to}
                      disabled={!h.open}
                      onChange={(e) => setHour(i, { to: e.target.value })}
                      aria-invalid={err ? true : undefined}
                    />
                    {i === 0 && (
                      <Button variant="ghost" size="sm" icon="copy" onClick={() => copyToWeekdays(0)}>
                        Copy to weekdays
                      </Button>
                    )}
                  </div>
                  {err && (
                    <p className={styles.error} role="alert">
                      {err}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Booking policy" subtitle="Rules applied when members book or cancel classes.">
          <div className={styles.grid}>
            <Input
              label="Cancellation window"
              type="number"
              min="0"
              max="168"
              step="1"
              inputMode="numeric"
              suffix="hours"
              hint="Members can cancel free of charge up to this many hours before class."
              value={values.policies.cancelWindowHours}
              onChange={(e) => setPolicy('cancelWindowHours', e.target.value)}
              error={errors['policies.cancelWindowHours'] || errors.cancelWindowHours}
            />
            <Input
              label="Max bookings per member"
              type="number"
              min="1"
              max="50"
              step="1"
              inputMode="numeric"
              suffix="/ week"
              value={values.policies.maxWeeklyBookings}
              onChange={(e) => setPolicy('maxWeeklyBookings', e.target.value)}
              error={errors['policies.maxWeeklyBookings'] || errors.maxWeeklyBookings}
            />
            <div className={styles.span2}>
              <Toggle
                checked={Boolean(values.policies.waitlist)}
                onChange={(v) => setPolicy('waitlist', v)}
                label="Enable waitlist"
                description="When a class is full, members can join a waitlist and are promoted automatically."
              />
            </div>
          </div>
        </Card>

        <div className={`${styles.saveBar} ${dirty ? styles.saveBarDirty : ''}`}>
          <p className={styles.saveText} aria-live="polite">
            {dirty ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <div className={styles.saveActions}>
            <Button variant="secondary" icon="refresh" onClick={handleReset} disabled={!dirty || saving}>
              Reset
            </Button>
            <Button type="submit" icon="check" loading={saving} disabled={!dirty && !data?.isNew}>
              Save settings
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

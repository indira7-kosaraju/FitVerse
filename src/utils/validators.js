/**
 * Tiny composable validation helpers.
 *
 *   const schema = { email: [rules.required(), rules.email()] };
 *   const errors = validate(values, schema); // { email: 'Enter a valid email' }
 *
 * A rule is `(value, allValues) => string | undefined`.
 */

const isEmpty = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

export const rules = {
  required: (msg = 'This field is required') => (v) => (isEmpty(v) ? msg : undefined),

  email: (msg = 'Enter a valid email address') => (v) =>
    isEmpty(v) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? undefined : msg,

  minLength: (n, msg) => (v) =>
    isEmpty(v) || String(v).trim().length >= n ? undefined : msg || `Must be at least ${n} characters`,

  maxLength: (n, msg) => (v) =>
    isEmpty(v) || String(v).length <= n ? undefined : msg || `Must be at most ${n} characters`,

  password: (msg = 'Use 8+ characters with a letter and a number') => (v) =>
    isEmpty(v) || (String(v).length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) ? undefined : msg,

  match: (field, msg = 'Values do not match') => (v, all) => (v === all?.[field] ? undefined : msg),

  phone: (msg = 'Enter a valid phone number') => (v) =>
    isEmpty(v) || /^\+?[\d\s()-]{7,20}$/.test(String(v)) ? undefined : msg,

  number: ({ min, max, integer = false, msg } = {}) => (v) => {
    if (isEmpty(v)) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return msg || 'Enter a number';
    if (integer && !Number.isInteger(n)) return msg || 'Enter a whole number';
    if (min !== undefined && n < min) return msg || `Must be at least ${min}`;
    if (max !== undefined && n > max) return msg || `Must be at most ${max}`;
    return undefined;
  },

  url: (msg = 'Enter a valid URL') => (v) => {
    if (isEmpty(v)) return undefined;
    try {
      new URL(v);
      return undefined;
    } catch {
      return msg;
    }
  },

  after: (field, msg = 'Must be after the start') => (v, all) => {
    if (isEmpty(v) || isEmpty(all?.[field])) return undefined;
    return new Date(v) > new Date(all[field]) ? undefined : msg;
  },

  custom: (fn, msg) => (v, all) => (fn(v, all) ? undefined : msg),
};

/** Runs a schema and returns an object of field → first error message. */
export function validate(values, schema) {
  const errors = {};
  Object.entries(schema).forEach(([field, fieldRules]) => {
    for (const rule of fieldRules) {
      const message = rule(values?.[field], values);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  });
  return errors;
}

export const hasErrors = (errors) => Object.values(errors || {}).some(Boolean);

/* ---------- Shared schemas ---------- */

export const loginSchema = {
  email: [rules.required('Email is required'), rules.email()],
  password: [rules.required('Password is required')],
};

export const registerSchema = {
  name: [rules.required('Name is required'), rules.minLength(2)],
  email: [rules.required('Email is required'), rules.email()],
  phone: [rules.phone()],
  password: [rules.required('Password is required'), rules.password()],
  confirmPassword: [rules.required('Please confirm your password'), rules.match('password', 'Passwords do not match')],
};

export const forgotPasswordSchema = {
  email: [rules.required('Email is required'), rules.email()],
};

export const resetPasswordSchema = {
  password: [rules.required('Password is required'), rules.password()],
  confirmPassword: [rules.required('Please confirm your password'), rules.match('password', 'Passwords do not match')],
};

export const changePasswordSchema = {
  currentPassword: [rules.required('Current password is required')],
  newPassword: [
    rules.required('New password is required'),
    rules.password(),
    rules.custom((v, all) => v !== all.currentPassword, 'New password must differ from the current one'),
  ],
  confirmPassword: [rules.required('Please confirm your password'), rules.match('newPassword', 'Passwords do not match')],
};

export const profileSchema = {
  name: [rules.required('Name is required'), rules.minLength(2)],
  phone: [rules.phone()],
  bio: [rules.maxLength(500)],
};

export const progressSchema = {
  date: [rules.required('Date is required')],
  weightKg: [rules.required('Weight is required'), rules.number({ min: 20, max: 400 })],
  bodyFatPct: [rules.number({ min: 2, max: 70 })],
  chest: [rules.number({ min: 0, max: 300 })],
  waist: [rules.number({ min: 0, max: 300 })],
  hips: [rules.number({ min: 0, max: 300 })],
  arms: [rules.number({ min: 0, max: 150 })],
  thighs: [rules.number({ min: 0, max: 200 })],
};

export const classSchema = {
  title: [rules.required('Title is required'), rules.minLength(3)],
  type: [rules.required('Type is required')],
  startTime: [rules.required('Start time is required')],
  endTime: [rules.required('End time is required'), rules.after('startTime', 'End must be after start')],
  capacity: [rules.required('Capacity is required'), rules.number({ min: 1, max: 500, integer: true })],
  location: [rules.required('Location is required')],
};

export const planSchema = {
  name: [rules.required('Name is required')],
  price: [rules.required('Price is required'), rules.number({ min: 0 })],
  durationDays: [rules.required('Duration is required'), rules.number({ min: 1, max: 3650, integer: true })],
};

/**
 * Validates a workout: at least one exercise, each with a name and at least
 * one set with reps >= 1 and weight >= 0. Returns a flat error map keyed like
 * `exercises.0.name`, `exercises.0.sets.1.reps`, plus `date` / `durationMin`.
 */
export function validateWorkout(values) {
  const errors = validate(values, {
    date: [rules.required('Date is required')],
    durationMin: [rules.number({ min: 1, max: 600, integer: true })],
  });
  if (!values.exercises?.length) errors.exercises = 'Add at least one exercise';
  values.exercises?.forEach((ex, i) => {
    if (isEmpty(ex.name)) errors[`exercises.${i}.name`] = 'Exercise name is required';
    if (!ex.sets?.length) errors[`exercises.${i}.sets`] = 'Add at least one set';
    ex.sets?.forEach((set, j) => {
      const repsErr = rules.required('Reps')(set.reps) || rules.number({ min: 1, max: 1000, integer: true })(set.reps);
      if (repsErr) errors[`exercises.${i}.sets.${j}.reps`] = repsErr;
      const wErr = rules.number({ min: 0, max: 1000 })(set.weightKg);
      if (wErr) errors[`exercises.${i}.sets.${j}.weightKg`] = wErr;
    });
  });
  return errors;
}

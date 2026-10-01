export const APP_NAME = 'FitVerse';

export const ROLES = Object.freeze({
  MEMBER: 'member',
  TRAINER: 'trainer',
  ADMIN: 'admin',
});

export const ROLE_HOME = Object.freeze({
  member: '/app',
  trainer: '/trainer',
  admin: '/admin',
});

export const THEME_STORAGE_KEY = 'fitverse-theme';

export const CURRENCY = 'USD';
export const LOCALE = 'en-US';

export const PAGE_SIZE = 10;

export const CLASS_TYPES = [
  { value: 'hiit', label: 'HIIT' },
  { value: 'strength', label: 'Strength' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'dance', label: 'Dance' },
  { value: 'mobility', label: 'Mobility' },
];

export const TIME_OF_DAY = [
  { value: 'morning', label: 'Morning (before 12pm)', from: 0, to: 12 },
  { value: 'afternoon', label: 'Afternoon (12–5pm)', from: 12, to: 17 },
  { value: 'evening', label: 'Evening (after 5pm)', from: 17, to: 24 },
];

export const MEMBERSHIP_STATUS = ['active', 'expired', 'cancelled', 'frozen'];
export const BOOKING_STATUS = ['booked', 'cancelled', 'attended', 'no_show'];
export const PAYMENT_STATUS = ['paid', 'pending', 'failed', 'refunded'];

/** Maps any status string to a Badge tone. */
export const STATUS_TONE = Object.freeze({
  active: 'success',
  paid: 'success',
  attended: 'success',
  succeeded: 'success',
  completed: 'success',
  booked: 'info',
  pending: 'warning',
  frozen: 'info',
  expired: 'neutral',
  cancelled: 'danger',
  failed: 'danger',
  no_show: 'danger',
  refunded: 'neutral',
  inactive: 'neutral',
});

export const SPECIALIZATIONS = [
  'Strength',
  'Hypertrophy',
  'Weight loss',
  'HIIT',
  'Yoga',
  'Pilates',
  'Mobility',
  'Boxing',
  'Nutrition',
  'Rehab',
  'Endurance',
];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

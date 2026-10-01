import { LOCALE } from './constants';

const toDate = (value) => (value instanceof Date ? value : new Date(value));
const isValid = (d) => d instanceof Date && !Number.isNaN(d.getTime());

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const d = toDate(value);
  return isValid(d) ? d.toLocaleDateString(LOCALE, options) : '—';
}

export function formatShortDate(value) {
  return formatDate(value, { month: 'short', day: 'numeric' });
}

export function formatWeekday(value, style = 'short') {
  return formatDate(value, { weekday: style });
}

export function formatTime(value) {
  if (!value) return '—';
  const d = toDate(value);
  return isValid(d) ? d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' }) : '—';
}

export function formatDateTime(value) {
  if (!value) return '—';
  return `${formatDate(value, { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(value)}`;
}

export function formatTimeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** yyyy-mm-dd in local time (for <input type="date"> and API query params). */
export function toISODate(value = new Date()) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** yyyy-mm-ddThh:mm in local time (for <input type="datetime-local">). */
export function toDateTimeLocal(value) {
  const d = toDate(value);
  if (!isValid(d)) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${toISODate(d)}T${hh}:${mm}`;
}

export function startOfDay(value = new Date()) {
  const d = new Date(toDate(value));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(value = new Date()) {
  const d = new Date(toDate(value));
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Monday-based start of week. */
export function startOfWeek(value = new Date()) {
  const d = startOfDay(value);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(value, days) {
  const d = new Date(toDate(value));
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a, b) {
  const x = toDate(a);
  const y = toDate(b);
  return (
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  );
}

export function isPast(value) {
  return toDate(value).getTime() < Date.now();
}

export function daysBetween(from, to) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86400000);
}

export function daysLeft(endDate) {
  if (!endDate) return 0;
  return Math.max(0, daysBetween(new Date(), endDate));
}

export function relativeDay(value) {
  const diff = daysBetween(new Date(), value);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDate(value, { weekday: 'short', month: 'short', day: 'numeric' });
}

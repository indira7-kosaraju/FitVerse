import { CURRENCY, LOCALE } from './constants';

const formatters = new Map();

function getFormatter(currency, compact) {
  const key = `${currency}-${compact}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: 0,
      })
    );
  }
  return formatters.get(key);
}

export function formatCurrency(amount, { currency = CURRENCY, compact = false } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return getFormatter(currency, compact).format(n);
}

export function formatNumber(value, options = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(LOCALE, options);
}

export function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  // Accept either 0.052 or 5.2 for "5.2%"
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(digits)}%`;
}

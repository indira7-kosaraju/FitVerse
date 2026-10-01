import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (!isProd && devFallback) return devFallback;
  throw new Error(`Missing required environment variable ${name}`);
}

function secret(name, devFallback) {
  const value = required(name, devFallback);
  if (isProd && value.length < 32) throw new Error(`${name} must be at least 32 characters in production`);
  return value;
}

const accessSecret = secret('JWT_ACCESS_SECRET', 'dev-access-secret-change-me');
const refreshSecret = secret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');
if (accessSecret === refreshSecret) throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');

const bool = (v, fallback) => (v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5001,
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/fitverse'),
  accessSecret,
  refreshSecret,
  accessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS) || 7,
  /** Only needed when the frontend is served from a different origin. Comma-separated. */
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** Used to build password-reset links. */
  clientUrl: required('CLIENT_URL', 'http://localhost:5173').replace(/\/$/, ''),
  apiPrefix: '/api/v1',
  /** Built frontend to serve (same-origin deployment). Empty = API only. */
  clientDist: process.env.CLIENT_DIST ? path.resolve(process.env.CLIENT_DIST) : '',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  /** Number of reverse proxies in front of the app (for correct client IPs and HTTPS detection). */
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
};

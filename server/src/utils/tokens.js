import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const REFRESH_COOKIE = 'fv_refresh';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, config.accessSecret, { expiresIn: config.accessTtl });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id), v: user.tokenVersion ?? 0 }, config.refreshSecret, {
    expiresIn: `${config.refreshTtlDays}d`,
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  // Cross-site deployments need SameSite=None; Secure (see README).
  sameSite: config.cookieSameSite,
  path: `${config.apiPrefix}/auth`,
});

export function setRefreshCookie(res, user) {
  res.cookie(REFRESH_COOKIE, signRefreshToken(user), {
    ...cookieOptions(),
    maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';
import { forbidden, unauthorized } from '../utils/AppError.js';

async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.accessSecret);
  } catch {
    // Expired/invalid → 401 so the client refreshes and retries once.
    throw unauthorized('Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized('Account no longer exists.');
  return user;
}

/** Requires a valid access token. */
export async function authenticate(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is sent; public otherwise. A bad token still yields 401. */
export async function optionalAuth(req, res, next) {
  req.user = await userFromRequest(req);
  next();
}

/** Role-based access control. Use after `authenticate`. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };

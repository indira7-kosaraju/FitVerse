import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import { badRequest, unauthorized } from '../utils/AppError.js';
import { ok } from '../utils/query.js';
import { REFRESH_COOKIE, clearRefreshCookie, setRefreshCookie, signAccessToken } from '../utils/tokens.js';
import { EMAIL_RE, PHONE_RE, check, passwordError } from '../utils/validate.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

function sendSession(res, user, status = 200) {
  setRefreshCookie(res, user);
  return ok(res, { user, accessToken: signAccessToken(user) }, status);
}

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, phone } = req.body ?? {};
  check({
    name: () => (typeof name !== 'string' || name.trim().length < 2 ? 'Name must be at least 2 characters.' : null),
    email: () => (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) ? 'Enter a valid email.' : null),
    password: () => passwordError(password),
    phone: () => (phone && !PHONE_RE.test(phone) ? 'Enter a valid phone number.' : null),
  });
  // Public sign-up always creates a member; trainers/admins are created by an admin.
  const user = await User.create({ name: name.trim(), email: email.trim(), password, phone: phone || undefined, role: 'member' });
  sendSession(res, user, 201);
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Email and password are required.');
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password +tokenVersion');
  if (!user || !(await user.comparePassword(password))) throw unauthorized('Incorrect email or password.');
  sendSession(res, user);
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  // No cookie = a logged-out visitor, not an error; answering 200 keeps every page load out of the console.
  // The client treats a missing token as "not signed in".
  if (!token) return ok(res, { accessToken: null });
  let payload;
  try {
    payload = jwt.verify(token, config.refreshSecret);
  } catch {
    clearRefreshCookie(res);
    throw unauthorized('Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || (user.tokenVersion ?? 0) !== payload.v) {
    clearRefreshCookie(res);
    throw unauthorized('Your session has expired. Please log in again.');
  }
  setRefreshCookie(res, user); // rotate
  ok(res, { accessToken: signAccessToken(user) });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const { sub } = jwt.verify(token, config.refreshSecret);
      await User.updateOne({ _id: sub }, { $inc: { tokenVersion: 1 } });
    } catch {
      /* already invalid */
    }
  }
  clearRefreshCookie(res);
  ok(res, null);
});

router.get('/me', authenticate, (req, res) => ok(res, req.user));

router.post('/forgot-password', authLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email.', { email: 'Enter a valid email.' });
  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordHash = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    // No email provider is configured: log the link so it can be used in development.
    console.log(`[password reset] ${email}: ${config.clientUrl}/reset-password/${token}`);
  }
  // Same response either way so emails can't be enumerated.
  ok(res, { message: 'If that email is registered, a reset link is on its way.' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body ?? {};
  check({ password: () => passwordError(password) });
  if (typeof token !== 'string' || !token) throw badRequest('This reset link is invalid or has expired.');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ resetPasswordHash: hash, resetPasswordExpires: { $gt: new Date() } }).select('+tokenVersion');
  if (!user) throw badRequest('This reset link is invalid or has expired.');
  user.password = password;
  user.resetPasswordHash = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  ok(res, { message: 'Password updated. You can log in now.' });
});

export default router;

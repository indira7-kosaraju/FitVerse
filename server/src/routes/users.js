import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { avatarUpload, removeUploadedFile } from '../middleware/upload.js';
import GymClass from '../models/GymClass.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import { badRequest, conflict, notFound } from '../utils/AppError.js';
import { assertObjectId, escapeRegex, ok, pageArray, paged, parseSort, pick } from '../utils/query.js';
import { setRefreshCookie } from '../utils/tokens.js';
import { check, passwordError } from '../utils/validate.js';
import { config } from '../config.js';

const router = Router();
router.use(authenticate);

const MEMBERSHIP_POPULATE = { path: 'membership', populate: { path: 'plan', select: 'name price durationDays' } };

/* ---------- Current user ---------- */

router.patch('/me', async (req, res) => {
  const fields = ['name', 'phone'];
  if (req.user.role === 'trainer') fields.push('bio', 'specializations');
  if (req.user.role === 'member') fields.push('emergencyContact');
  const updates = pick(req.body, fields);
  if (updates.phone === '') updates.phone = undefined;
  if (updates.emergencyContact) {
    const ec = pick(updates.emergencyContact, ['name', 'phone', 'relation']);
    check({ 'emergencyContact.name': () => (ec.phone && !ec.name ? 'Name is required when a phone is set.' : null) });
    updates.emergencyContact = ec;
  }
  if (updates.specializations && !Array.isArray(updates.specializations)) {
    throw badRequest('Specializations must be a list.', { specializations: 'Must be a list' });
  }
  req.user.set(updates);
  await req.user.save();
  ok(res, req.user);
});

router.post('/me/avatar', avatarUpload, async (req, res) => {
  if (!req.file) throw badRequest('Choose an image to upload.');
  const previous = req.user.avatarUrl;
  req.user.avatarUrl = `${config.apiPrefix}/uploads/avatars/${req.file.filename}`;
  await req.user.save();
  if (previous) removeUploadedFile(previous);
  ok(res, req.user);
});

router.patch('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  check({
    currentPassword: () => (!currentPassword ? 'Enter your current password.' : null),
    newPassword: () => passwordError(newPassword),
  });
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(currentPassword))) {
    throw badRequest('Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
  }
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // sign out other sessions
  await user.save();
  setRefreshCookie(res, user); // keep this session
  ok(res, { message: 'Password updated.' });
});

/* ---------- Admin user management ---------- */

router.use(authorize('admin'));

const USER_SORTS = ['createdAt', 'name', 'email'];
const MEMBERSHIP_SORTS = { plan: (u) => u.membership?.plan?.name ?? '', status: (u) => u.membership?.status ?? '', endDate: (u) => u.membership?.endDate?.getTime?.() ?? 0 };

router.get('/', async (req, res) => {
  const { role, search, status, sort } = req.query;
  const filter = {};
  if (['member', 'trainer', 'admin'].includes(role)) filter.role = role;
  if (search) {
    const re = new RegExp(escapeRegex(String(search).slice(0, 100)), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  if (status) {
    await Membership.expireLapsed();
    const memberIds = await Membership.find({ status: String(status) }).distinct('_id');
    filter.membership = { $in: memberIds };
  }

  const key = typeof sort === 'string' ? sort.replace(/^-/, '') : '';
  if (MEMBERSHIP_SORTS[key]) {
    // Sorting by a populated field: load the (filtered) set and sort in memory.
    const users = await User.find(filter).populate(MEMBERSHIP_POPULATE);
    const getter = MEMBERSHIP_SORTS[key];
    const dir = sort.startsWith('-') ? -1 : 1;
    users.sort((a, b) => (getter(a) > getter(b) ? dir : getter(a) < getter(b) ? -dir : 0));
    return res.json(pageArray(users, req.query));
  }
  res.json(await paged(User, filter, { query: req.query, sort: parseSort(sort, USER_SORTS, { createdAt: -1 }), populate: MEMBERSHIP_POPULATE }));
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(assertObjectId(req.params.id)).populate(MEMBERSHIP_POPULATE);
  if (!user) throw notFound('User');
  ok(res, user);
});

router.post('/', async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'password', 'phone', 'role', 'bio', 'specializations']);
  check({ password: () => passwordError(data.password) });
  data.role = ['member', 'trainer', 'admin'].includes(data.role) ? data.role : 'trainer';
  const user = await User.create(data);
  ok(res, user, 201);
});

router.put('/:id', async (req, res) => {
  const user = await User.findById(assertObjectId(req.params.id));
  if (!user) throw notFound('User');
  const updates = pick(req.body, ['name', 'phone', 'role', 'bio', 'specializations', 'emergencyContact']);
  if (updates.phone === '') updates.phone = undefined;
  if (updates.role && String(user._id) === String(req.user._id) && updates.role !== 'admin') {
    throw badRequest("You can't remove your own admin role.");
  }
  user.set(updates);
  await user.save();
  await user.populate(MEMBERSHIP_POPULATE);
  ok(res, user);
});

router.delete('/:id', async (req, res) => {
  const id = assertObjectId(req.params.id);
  if (id === String(req.user._id)) throw badRequest("You can't delete your own account.");
  const user = await User.findById(id);
  if (!user) throw notFound('User');
  if (user.role === 'trainer' && (await GymClass.exists({ trainer: id, startTime: { $gte: new Date() } }))) {
    throw conflict('This trainer has upcoming classes. Reassign or delete them first.');
  }
  await user.deleteOne();
  if (user.avatarUrl) removeUploadedFile(user.avatarUrl);
  ok(res, null);
});

export default router;

import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import Booking, { ACTIVE_BOOKING } from '../models/Booking.js';
import GymClass, { CLASS_TYPES } from '../models/GymClass.js';
import User from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';
import { assertObjectId, dateRange, isObjectId, ok, paged, parseSort, pick } from '../utils/query.js';

const router = Router();

const TRAINER_POPULATE = { path: 'trainer', select: 'name avatarUrl' };
const FIELDS = ['title', 'type', 'description', 'location', 'startTime', 'endTime', 'capacity'];

/** Adds `isBookedByMe` for a signed-in member. */
async function withBookedFlag(classes, user) {
  const list = classes.map((c) => c.toJSON());
  if (!user || user.role !== 'member' || !list.length) return list;
  const mine = await Booking.find({ user: user._id, gymClass: { $in: list.map((c) => c._id) }, status: 'booked' }).distinct('gymClass');
  const set = new Set(mine.map(String));
  return list.map((c) => ({ ...c, isBookedByMe: set.has(String(c._id)) }));
}

async function loadOwnedClass(req) {
  const gymClass = await GymClass.findById(assertObjectId(req.params.id));
  if (!gymClass) throw notFound('Class');
  if (req.user.role === 'trainer' && String(gymClass.trainer) !== String(req.user._id)) {
    throw forbidden('You can only manage your own classes.');
  }
  return gymClass;
}

async function assertTrainer(id) {
  if (!isObjectId(String(id ?? ''))) throw badRequest('Choose a trainer.', { trainer: 'Trainer is required' });
  if (!(await User.exists({ _id: id, role: 'trainer' }))) throw badRequest('Choose a valid trainer.', { trainer: 'Not a trainer' });
}

/* ---------- Public schedule ---------- */

router.get('/', optionalAuth, async (req, res) => {
  const filter = {};
  const range = dateRange(req.query);
  if (range) filter.startTime = range;
  if (CLASS_TYPES.includes(req.query.type)) filter.type = req.query.type;
  if (req.query.trainer) filter.trainer = assertObjectId(req.query.trainer, 'trainer');
  const result = await paged(GymClass, filter, {
    query: req.query,
    defaultLimit: 100,
    sort: parseSort(req.query.sort, ['startTime', 'createdAt', 'title'], { startTime: 1 }),
    populate: TRAINER_POPULATE,
  });
  result.data = await withBookedFlag(result.data, req.user);
  res.json(result);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const gymClass = await GymClass.findById(assertObjectId(req.params.id)).populate(TRAINER_POPULATE);
  if (!gymClass) throw notFound('Class');
  ok(res, (await withBookedFlag([gymClass], req.user))[0]);
});

/* ---------- Trainers (own classes) and admins ---------- */

router.use(authenticate, authorize('trainer', 'admin'));

router.post('/', async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (req.user.role === 'trainer') {
    data.trainer = req.user._id; // trainers always schedule themselves
  } else {
    await assertTrainer(req.body?.trainer);
    data.trainer = req.body.trainer;
  }
  const gymClass = await GymClass.create(data);
  await gymClass.populate(TRAINER_POPULATE);
  ok(res, gymClass, 201);
});

router.put('/:id', async (req, res) => {
  const gymClass = await loadOwnedClass(req);
  const updates = pick(req.body, FIELDS);
  if (req.user.role === 'admin' && req.body?.trainer !== undefined) {
    const trainerId = typeof req.body.trainer === 'object' ? req.body.trainer?._id : req.body.trainer;
    await assertTrainer(trainerId);
    updates.trainer = trainerId;
  }
  if (updates.capacity !== undefined && Number(updates.capacity) < gymClass.bookedCount) {
    throw badRequest(`${gymClass.bookedCount} people are already booked.`, { capacity: `Must be at least ${gymClass.bookedCount}` });
  }
  gymClass.set(updates);
  await gymClass.save();
  await gymClass.populate(TRAINER_POPULATE);
  ok(res, gymClass);
});

router.delete('/:id', async (req, res) => {
  const gymClass = await loadOwnedClass(req);
  await Booking.updateMany({ gymClass: gymClass._id, status: 'booked' }, { $set: { status: 'cancelled', cancelledAt: new Date() } });
  await gymClass.deleteOne();
  ok(res, null);
});

router.get('/:id/roster', async (req, res) => {
  const gymClass = await loadOwnedClass(req);
  const roster = await Booking.find({ gymClass: gymClass._id })
    .sort({ createdAt: 1 })
    .populate({ path: 'user', select: 'name email avatarUrl phone' });
  res.json({ success: true, data: roster, total: roster.length, page: 1, pages: 1, activeCount: roster.filter((b) => ACTIVE_BOOKING.includes(b.status)).length });
});

export default router;

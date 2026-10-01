import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Booking from '../models/Booking.js';
import GymClass from '../models/GymClass.js';
import Membership from '../models/Membership.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError.js';
import { assertObjectId, ok, pageArray } from '../utils/query.js';
import { getPolicies } from '../utils/settings.js';

const router = Router();
router.use(authenticate);

const CLASS_POPULATE = { path: 'gymClass', populate: { path: 'trainer', select: 'name avatarUrl' } };

function weekBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

router.post('/', authorize('member'), async (req, res) => {
  const classId = assertObjectId(req.body?.classId, 'classId');
  const gymClass = await GymClass.findById(classId);
  if (!gymClass) throw notFound('Class');
  if (gymClass.startTime <= new Date()) throw badRequest('This class has already started.');

  await Membership.expireLapsed();
  if (!(await Membership.exists({ user: req.user._id, status: 'active' }))) {
    throw forbidden('You need an active membership to book classes.');
  }

  const existing = await Booking.findOne({ user: req.user._id, gymClass: classId });
  if (existing && existing.status !== 'cancelled') throw conflict("You're already booked into this class.");

  const { maxWeeklyBookings } = await getPolicies();
  const { start, end } = weekBounds(gymClass.startTime);
  const weekClassIds = await GymClass.find({ startTime: { $gte: start, $lt: end } }).distinct('_id');
  const weekCount = await Booking.countDocuments({ user: req.user._id, gymClass: { $in: weekClassIds }, status: 'booked' });
  if (weekCount >= maxWeeklyBookings) throw badRequest(`You can book up to ${maxWeeklyBookings} classes per week.`);

  // Atomically take a spot only if one is free.
  const claimed = await GymClass.findOneAndUpdate(
    { _id: classId, $expr: { $lt: ['$bookedCount', '$capacity'] } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
  if (!claimed) throw conflict('This class is full.');

  let booking;
  try {
    if (existing) {
      existing.status = 'booked';
      existing.cancelledAt = undefined;
      booking = await existing.save();
    } else {
      booking = await Booking.create({ user: req.user._id, gymClass: classId });
    }
  } catch (err) {
    await GymClass.updateOne({ _id: classId }, { $inc: { bookedCount: -1 } });
    if (err?.code === 11000) throw conflict("You're already booked into this class.");
    throw err;
  }
  await booking.populate(CLASS_POPULATE);
  ok(res, booking, 201);
});

router.get('/me', async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = String(req.query.status);
  const bookings = (await Booking.find(filter).populate(CLASS_POPULATE)).filter((b) => b.gymClass);
  const sort = String(req.query.sort || '-createdAt');
  const desc = sort.startsWith('-');
  const key = sort.replace(/^-/, '');
  const value = (b) => (key === 'gymClass.startTime' ? b.gymClass.startTime : b.createdAt).getTime();
  bookings.sort((a, b) => (desc ? value(b) - value(a) : value(a) - value(b)));
  res.json(pageArray(bookings, req.query));
});

router.delete('/:id', async (req, res) => {
  const booking = await Booking.findById(assertObjectId(req.params.id)).populate('gymClass');
  if (!booking) throw notFound('Booking');
  if (req.user.role !== 'admin' && String(booking.user) !== String(req.user._id)) throw forbidden();
  if (booking.status !== 'booked') throw badRequest(`This booking is already ${booking.status.replace('_', ' ')}.`);

  if (req.user.role !== 'admin' && booking.gymClass) {
    const { cancelWindowHours } = await getPolicies();
    const cutoff = booking.gymClass.startTime.getTime() - cancelWindowHours * 60 * 60 * 1000;
    if (Date.now() > cutoff && booking.gymClass.startTime > new Date()) {
      throw badRequest(`Bookings can't be cancelled within ${cancelWindowHours} hours of the class.`);
    }
  }
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  if (booking.gymClass) {
    await GymClass.updateOne({ _id: booking.gymClass._id, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
  }
  ok(res, booking);
});

/** Trainer (own classes) or admin marks attendance. */
router.patch('/:id/attend', authorize('trainer', 'admin'), async (req, res) => {
  const status = req.body?.status;
  if (!['attended', 'no_show'].includes(status)) throw badRequest('Status must be "attended" or "no_show".');
  const booking = await Booking.findById(assertObjectId(req.params.id)).populate('gymClass');
  if (!booking || !booking.gymClass) throw notFound('Booking');
  if (req.user.role === 'trainer' && String(booking.gymClass.trainer) !== String(req.user._id)) {
    throw forbidden('You can only mark attendance for your own classes.');
  }
  if (booking.status === 'cancelled') throw badRequest('This booking was cancelled.');
  booking.status = status;
  await booking.save();
  await booking.populate({ path: 'user', select: 'name email avatarUrl' });
  ok(res, booking);
});

export default router;

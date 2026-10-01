import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import Membership from '../models/Membership.js';
import { forbidden } from '../utils/AppError.js';
import { dateRange, ok, paged } from '../utils/query.js';

const router = Router();
router.use(authenticate);

router.post('/checkin', async (req, res) => {
  if (req.user.role === 'member') {
    await Membership.expireLapsed();
    if (!(await Membership.exists({ user: req.user._id, status: 'active' }))) {
      throw forbidden('You need an active membership to check in.');
    }
  }
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // One check-in per day; repeat taps return the existing one.
  const existing = await Attendance.findOne({ user: req.user._id, checkInAt: { $gte: startOfDay } });
  if (existing) return ok(res, existing);
  ok(res, await Attendance.create({ user: req.user._id }), 201);
});

router.get('/me', async (req, res) => {
  const filter = { user: req.user._id };
  const range = dateRange(req.query);
  if (range) filter.checkInAt = range;
  res.json(await paged(Attendance, filter, { query: req.query, sort: { checkInAt: -1 } }));
});

export default router;

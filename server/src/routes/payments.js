import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { dateRange, escapeRegex, paged, parseSort } from '../utils/query.js';

const router = Router();
router.use(authenticate);

const SORTS = ['createdAt', 'amount', 'paidAt'];

router.get('/me', async (req, res) => {
  res.json(
    await paged(Payment, { user: req.user._id }, {
      query: req.query,
      sort: parseSort(req.query.sort, SORTS, { createdAt: -1 }),
      populate: { path: 'plan', select: 'name' },
    })
  );
});

router.get('/', authorize('admin'), async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  const range = dateRange(req.query);
  if (range) filter.createdAt = range;
  if (req.query.search) {
    const re = new RegExp(escapeRegex(String(req.query.search).slice(0, 100)), 'i');
    filter.user = { $in: await User.find({ $or: [{ name: re }, { email: re }] }).distinct('_id') };
  }
  res.json(
    await paged(Payment, filter, {
      query: req.query,
      sort: parseSort(req.query.sort, SORTS, { createdAt: -1 }),
      populate: [{ path: 'user', select: 'name email avatarUrl' }, { path: 'plan', select: 'name' }],
    })
  );
});

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';
import { assertObjectId, dateRange, isObjectId, ok, paged, parseSort } from '../utils/query.js';

const router = Router();
router.use(authenticate);

const DAY = 24 * 60 * 60 * 1000;

router.get('/me', authorize('member'), async (req, res) => {
  await Membership.expireLapsed();
  const membership = await Membership.findOne({ user: req.user._id }).sort({ createdAt: -1 }).populate('plan');
  ok(res, membership);
});

/**
 * Starts (or switches to) a plan. There is no payment gateway, so the charge is
 * recorded as paid immediately.
 */
router.post('/subscribe', authorize('member'), async (req, res) => {
  const planId = assertObjectId(req.body?.planId, 'planId');
  const plan = await Plan.findById(planId);
  if (!plan || plan.active === false) throw notFound('Plan');

  const now = new Date();
  await Membership.updateMany(
    { user: req.user._id, status: { $in: ['active', 'frozen'] } },
    { $set: { status: 'cancelled', cancelledAt: now } }
  );
  const membership = await Membership.create({
    user: req.user._id,
    plan: plan._id,
    status: 'active',
    startDate: now,
    endDate: new Date(now.getTime() + plan.durationDays * DAY),
  });
  await Payment.create({ user: req.user._id, plan: plan._id, membership: membership._id, amount: plan.price, status: 'paid', paidAt: now });
  await User.updateOne({ _id: req.user._id }, { membership: membership._id });
  await membership.populate('plan');
  ok(res, membership, 201);
});

router.patch('/:id/cancel', authorize('member', 'admin'), async (req, res) => {
  const membership = await Membership.findById(assertObjectId(req.params.id));
  if (!membership) throw notFound('Membership');
  if (req.user.role !== 'admin' && String(membership.user) !== String(req.user._id)) throw forbidden();
  if (!['active', 'frozen'].includes(membership.status)) throw badRequest(`This membership is already ${membership.status}.`);
  membership.status = 'cancelled';
  membership.cancelledAt = new Date();
  await membership.save();
  await membership.populate('plan');
  ok(res, membership);
});

/* ---------- Admin ---------- */

router.get('/', authorize('admin'), async (req, res) => {
  await Membership.expireLapsed();
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (isObjectId(String(req.query.plan ?? ''))) filter.plan = req.query.plan;
  const range = dateRange(req.query);
  if (range) filter.startDate = range;
  res.json(
    await paged(Membership, filter, {
      query: req.query,
      sort: parseSort(req.query.sort, ['createdAt', 'startDate', 'endDate', 'status'], { createdAt: -1 }),
      populate: [{ path: 'plan', select: 'name price durationDays' }, { path: 'user', select: 'name email avatarUrl' }],
    })
  );
});

router.patch('/:id/freeze', authorize('admin'), async (req, res) => {
  const membership = await Membership.findById(assertObjectId(req.params.id));
  if (!membership) throw notFound('Membership');
  const freeze = req.body?.freeze !== false;
  if (freeze && membership.status !== 'active') throw badRequest('Only active memberships can be frozen.');
  if (!freeze && membership.status !== 'frozen') throw badRequest('Only frozen memberships can be reactivated.');
  membership.status = freeze ? 'frozen' : 'active';
  await membership.save();
  await membership.populate('plan');
  ok(res, membership);
});

export default router;

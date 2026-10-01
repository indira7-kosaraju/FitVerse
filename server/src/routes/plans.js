import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import { conflict, notFound } from '../utils/AppError.js';
import { assertObjectId, ok, paged, parseSort, pick } from '../utils/query.js';

const router = Router();
const FIELDS = ['name', 'description', 'price', 'durationDays', 'features', 'active', 'popular'];

/** Public: active plans. Admins also see inactive ones. */
router.get('/', optionalAuth, async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { active: { $ne: false } };
  res.json(await paged(Plan, filter, { query: req.query, defaultLimit: 100, sort: parseSort(req.query.sort, ['price', 'name', 'createdAt'], { price: 1 }) }));
});

router.use(authenticate, authorize('admin'));

router.post('/', async (req, res) => {
  ok(res, await Plan.create(pick(req.body, FIELDS)), 201);
});

router.put('/:id', async (req, res) => {
  const plan = await Plan.findById(assertObjectId(req.params.id));
  if (!plan) throw notFound('Plan');
  // The active toggle sends the whole plan back; only whitelisted fields are applied.
  plan.set(pick(req.body, FIELDS));
  await plan.save();
  ok(res, plan);
});

router.delete('/:id', async (req, res) => {
  const id = assertObjectId(req.params.id);
  if (await Membership.exists({ plan: id })) {
    throw conflict('Members have subscribed to this plan. Deactivate it instead of deleting it.');
  }
  const plan = await Plan.findByIdAndDelete(id);
  if (!plan) throw notFound('Plan');
  ok(res, null);
});

export default router;

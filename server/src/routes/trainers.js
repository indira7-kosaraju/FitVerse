import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import { forbidden, notFound } from '../utils/AppError.js';
import { clientIdsOf } from '../utils/clients.js';
import { assertObjectId, escapeRegex, ok, paged } from '../utils/query.js';

const router = Router();

/** Fields safe to show publicly. */
const PUBLIC_FIELDS = 'name email avatarUrl bio specializations';

router.get('/', async (req, res) => {
  const filter = { role: 'trainer' };
  if (req.query.search) filter.name = new RegExp(escapeRegex(String(req.query.search).slice(0, 100)), 'i');
  if (req.query.specialization) filter.specializations = String(req.query.specialization);
  res.json(await paged(User, filter, { query: req.query, defaultLimit: 12, sort: { name: 1, _id: 1 }, select: PUBLIC_FIELDS }));
});

router.get('/:id', async (req, res) => {
  const trainer = await User.findOne({ _id: assertObjectId(req.params.id), role: 'trainer' }).select(PUBLIC_FIELDS);
  if (!trainer) throw notFound('Trainer');
  ok(res, trainer);
});

/** A trainer's clients. Trainers can only see their own; admins can see any. */
router.get('/:id/clients', authenticate, authorize('trainer', 'admin'), async (req, res) => {
  const trainerId = assertObjectId(req.params.id);
  if (req.user.role === 'trainer' && trainerId !== String(req.user._id)) throw forbidden('You can only view your own clients.');
  const filter = { _id: { $in: await clientIdsOf(trainerId) }, role: 'member' };
  if (req.query.search) {
    const re = new RegExp(escapeRegex(String(req.query.search).slice(0, 100)), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  res.json(
    await paged(User, filter, {
      query: req.query,
      defaultLimit: 12,
      sort: { name: 1, _id: 1 },
      populate: { path: 'membership', select: 'status startDate endDate plan', populate: { path: 'plan', select: 'name' } },
    })
  );
});

export default router;

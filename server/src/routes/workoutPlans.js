import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';
import { isClientOf } from '../utils/clients.js';
import { assertObjectId, ok } from '../utils/query.js';

const router = Router();
router.use(authenticate);

const TRAINER_POPULATE = { path: 'trainer', select: 'name avatarUrl' };

/** Strips client-only keys, keeping sub-document _ids so day completion survives edits. */
function cleanWeeks(weeks) {
  if (!Array.isArray(weeks)) return weeks;
  return weeks.map((w) => ({
    ...(w?._id ? { _id: w._id } : {}),
    days: Array.isArray(w?.days)
      ? w.days.map((d) => ({
          ...(d?._id ? { _id: d._id } : {}),
          name: d?.name,
          completed: Boolean(d?.completed),
          exercises: Array.isArray(d?.exercises)
            ? d.exercises.map((e) => ({ ...(e?._id ? { _id: e._id } : {}), name: e?.name, sets: e?.sets, reps: e?.reps, notes: e?.notes }))
            : d?.exercises,
        }))
      : w?.days,
  }));
}

async function assertCanManage(req, memberId) {
  if (req.user.role === 'admin') return;
  if (!(await isClientOf(req.user._id, memberId))) throw forbidden('This member is not one of your clients.');
}

/* ---------- Member ---------- */

router.get('/me', authorize('member'), async (req, res) => {
  ok(res, await WorkoutPlan.findOne({ member: req.user._id }).sort({ updatedAt: -1 }).populate(TRAINER_POPULATE));
});

router.patch('/:planId/days/:dayId/complete', authorize('member'), async (req, res) => {
  const plan = await WorkoutPlan.findById(assertObjectId(req.params.planId, 'planId'));
  if (!plan) throw notFound('Workout plan');
  if (String(plan.member) !== String(req.user._id)) throw forbidden();
  const day = plan.weeks.flatMap((w) => w.days).find((d) => String(d._id) === req.params.dayId);
  if (!day) throw notFound('Plan day');
  day.completed = req.body?.completed !== false;
  await plan.save();
  await plan.populate(TRAINER_POPULATE);
  ok(res, plan);
});

/* ---------- Trainer / admin ---------- */

router.get('/', authorize('trainer', 'admin'), async (req, res) => {
  const memberId = assertObjectId(req.query.member, 'member');
  await assertCanManage(req, memberId);
  ok(res, await WorkoutPlan.findOne({ member: memberId }).sort({ updatedAt: -1 }).populate(TRAINER_POPULATE));
});

router.post('/', authorize('trainer', 'admin'), async (req, res) => {
  const memberId = assertObjectId(req.body?.member, 'member');
  if (!(await User.exists({ _id: memberId, role: 'member' }))) throw badRequest('Choose a valid member.');
  await assertCanManage(req, memberId);
  const plan = await WorkoutPlan.create({
    member: memberId,
    trainer: req.user.role === 'trainer' ? req.user._id : req.body?.trainer,
    title: req.body?.title,
    weeks: cleanWeeks(req.body?.weeks),
  });
  await plan.populate(TRAINER_POPULATE);
  ok(res, plan, 201);
});

router.put('/:id', authorize('trainer', 'admin'), async (req, res) => {
  const plan = await WorkoutPlan.findById(assertObjectId(req.params.id));
  if (!plan) throw notFound('Workout plan');
  if (req.user.role === 'trainer' && String(plan.trainer) !== String(req.user._id)) {
    throw forbidden('Only the trainer who created this plan can edit it.');
  }
  if (req.body?.title !== undefined) plan.title = req.body.title;
  if (req.body?.weeks !== undefined) plan.weeks = cleanWeeks(req.body.weeks);
  await plan.save();
  await plan.populate(TRAINER_POPULATE);
  ok(res, plan);
});

export default router;

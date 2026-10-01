import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Workout from '../models/Workout.js';
import { forbidden, notFound } from '../utils/AppError.js';
import { assertObjectId, dateRange, ok, paged, parseSort, pick } from '../utils/query.js';

const router = Router();
router.use(authenticate);

const FIELDS = ['date', 'durationMin', 'notes', 'exercises'];

async function loadOwn(req) {
  const workout = await Workout.findById(assertObjectId(req.params.id));
  if (!workout) throw notFound('Workout');
  if (String(workout.user) !== String(req.user._id)) throw forbidden();
  return workout;
}

router.get('/me', async (req, res) => {
  const filter = { user: req.user._id };
  const range = dateRange(req.query);
  if (range) filter.date = range;
  res.json(await paged(Workout, filter, { query: req.query, sort: parseSort(req.query.sort, ['date', 'createdAt'], { date: -1 }) }));
});

router.post('/', async (req, res) => {
  ok(res, await Workout.create({ ...pick(req.body, FIELDS), user: req.user._id }), 201);
});

router.put('/:id', async (req, res) => {
  const workout = await loadOwn(req);
  workout.set(pick(req.body, FIELDS));
  await workout.save();
  ok(res, workout);
});

router.delete('/:id', async (req, res) => {
  await (await loadOwn(req)).deleteOne();
  ok(res, null);
});

export default router;

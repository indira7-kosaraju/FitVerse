import { Router } from 'express';
import { config } from '../config.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { progressUpload, removeUploadedFile } from '../middleware/upload.js';
import Progress from '../models/Progress.js';
import { badRequest, forbidden, notFound } from '../utils/AppError.js';
import { isClientOf } from '../utils/clients.js';
import { assertObjectId, dateRange, ok, paged, parseSort, pick } from '../utils/query.js';

const router = Router();
router.use(authenticate);

const SORTS = ['date', 'createdAt'];

function listFor(userId, query) {
  const filter = { user: userId };
  const range = dateRange(query);
  if (range) filter.date = range;
  return paged(Progress, filter, { query, sort: parseSort(query.sort, SORTS, { date: 1 }) });
}

async function loadOwn(req) {
  const entry = await Progress.findById(assertObjectId(req.params.id));
  if (!entry) throw notFound('Progress entry');
  if (String(entry.user) !== String(req.user._id)) throw forbidden();
  return entry;
}

router.get('/me', async (req, res) => res.json(await listFor(req.user._id, req.query)));

/** Trainer views a client's progress (or an admin, any member's). */
router.get('/', authorize('trainer', 'admin'), async (req, res) => {
  const memberId = assertObjectId(req.query.member, 'member');
  if (req.user.role === 'trainer' && !(await isClientOf(req.user._id, memberId))) {
    throw forbidden('This member is not one of your clients.');
  }
  res.json(await listFor(memberId, req.query));
});

router.post('/', async (req, res) => {
  const data = pick(req.body, ['date', 'weightKg', 'bodyFatPct', 'measurements']);
  if (data.measurements) data.measurements = pick(data.measurements, ['chest', 'waist', 'hips', 'arms', 'thighs']);
  ok(res, await Progress.create({ ...data, user: req.user._id }), 201);
});

router.delete('/:id', async (req, res) => {
  const entry = await loadOwn(req);
  await entry.deleteOne();
  entry.photoUrls.forEach(removeUploadedFile);
  ok(res, null);
});

router.post('/:id/photos', async (req, res) => {
  const entry = await loadOwn(req); // check ownership before accepting files
  await new Promise((resolve, reject) => progressUpload(req, res, (err) => (err ? reject(err) : resolve())));
  if (!req.files?.length) throw badRequest('Choose at least one photo.');
  entry.photoUrls.push(...req.files.map((f) => `${config.apiPrefix}/uploads/progress/${f.filename}`));
  await entry.save();
  ok(res, entry);
});

export default router;

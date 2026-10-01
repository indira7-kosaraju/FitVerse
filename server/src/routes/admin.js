import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import Attendance from '../models/Attendance.js';
import Booking from '../models/Booking.js';
import GymClass from '../models/GymClass.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { badRequest } from '../utils/AppError.js';
import { dateRange, ok, pick } from '../utils/query.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get('/stats', async (req, res) => {
  await Membership.expireLapsed();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [activeIds, revenue, checkInsToday, newMembersThisMonth, lost, mix] = await Promise.all([
    Membership.find({ status: 'active' }).distinct('user'),
    Payment.aggregate([{ $match: { status: 'paid', paidAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Attendance.countDocuments({ checkInAt: { $gte: startOfToday() } }),
    User.countDocuments({ role: 'member', createdAt: { $gte: monthStart } }),
    // Members whose membership lapsed or was cancelled in the last 30 days, with no active one now.
    Membership.find({
      $or: [
        { status: 'cancelled', cancelledAt: { $gte: thirtyDaysAgo } },
        { status: 'expired', endDate: { $gte: thirtyDaysAgo } },
      ],
    }).distinct('user'),
    Membership.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $lookup: { from: 'plans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $project: { _id: 0, name: { $ifNull: [{ $first: '$plan.name' }, 'Deleted plan'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const active = new Set(activeIds.map(String));
  const churned = lost.map(String).filter((id) => !active.has(id)).length;
  const base = active.size + churned;

  ok(res, {
    activeMembers: active.size,
    revenueMTD: revenue[0]?.total ?? 0,
    checkInsToday,
    churnRate: base ? churned / base : 0, // fraction (0–1)
    newMembersThisMonth,
    membershipMix: mix,
  });
});

router.get('/revenue', async (req, res) => {
  const range = ['7d', '30d', '12m'].includes(req.query.range) ? req.query.range : '30d';
  const now = new Date();
  const points = [];
  let start;
  let keyOf;
  if (range === '12m') {
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    keyOf = monthKey;
    for (let i = 0; i < 12; i += 1) points.push({ date: monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)), amount: 0 });
  } else {
    const days = range === '7d' ? 7 : 30;
    start = startOfToday();
    start.setDate(start.getDate() - (days - 1));
    keyOf = dayKey;
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      points.push({ date: dayKey(d), amount: 0 });
    }
  }
  const index = new Map(points.map((p) => [p.date, p]));
  const payments = await Payment.find({ status: 'paid', paidAt: { $gte: start } }).select('amount paidAt').lean();
  for (const p of payments) {
    const point = index.get(keyOf(p.paidAt));
    if (point) point.amount += p.amount;
  }
  ok(res, points.map((p) => ({ ...p, amount: Math.round(p.amount * 100) / 100 })));
});

router.get('/peak-hours', async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const rows = await Attendance.find({ checkInAt: { $gte: since } }).select('checkInAt').lean();
  for (const r of rows) counts[r.checkInAt.getHours()].count += 1;
  ok(res, counts);
});

/* ---------- Settings ---------- */

const SETTINGS_FIELDS = ['gymName', 'email', 'phone', 'address', 'website', 'currency', 'hours', 'policies'];

router.get('/settings', async (req, res) => {
  ok(res, await Settings.findOne({ key: 'gym' }));
});

router.put('/settings', async (req, res) => {
  const data = pick(req.body, SETTINGS_FIELDS);
  if (data.website && !/^https?:\/\/\S+\.\S+/.test(data.website)) {
    throw badRequest('Please fix the highlighted fields.', { website: 'Enter a full URL, e.g. https://example.com' });
  }
  if (Array.isArray(data.hours)) {
    const errors = {};
    data.hours.forEach((h, i) => {
      if (h?.open && h.from && h.to && h.to <= h.from) errors[`hours.${i}`] = 'Closing time must be after opening time';
    });
    if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields.', errors);
  }
  const settings = (await Settings.findOne({ key: 'gym' })) ?? new Settings({ key: 'gym' });
  settings.set(data);
  await settings.save();
  ok(res, settings);
});

/* ---------- CSV export ---------- */

/** Escapes a CSV cell and neutralises spreadsheet formula injection. */
function cell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

const REPORTS = {
  async payments(range) {
    const rows = await Payment.find(range ? { createdAt: range } : {})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('plan', 'name')
      .lean();
    return toCsv(
      ['Date', 'Member', 'Email', 'Plan', 'Amount', 'Status'],
      rows.map((p) => [p.paidAt ?? p.createdAt, p.user?.name, p.user?.email, p.plan?.name, p.amount, p.status])
    );
  },
  async members(range) {
    const rows = await User.find({ role: 'member', ...(range ? { createdAt: range } : {}) })
      .sort({ createdAt: -1 })
      .populate({ path: 'membership', populate: { path: 'plan', select: 'name' } })
      .lean();
    return toCsv(
      ['Joined', 'Name', 'Email', 'Phone', 'Plan', 'Membership status', 'Membership ends'],
      rows.map((u) => [u.createdAt, u.name, u.email, u.phone, u.membership?.plan?.name, u.membership?.status, u.membership?.endDate])
    );
  },
  async attendance(range) {
    const rows = await Attendance.find(range ? { checkInAt: range } : {}).sort({ checkInAt: -1 }).populate('user', 'name email').lean();
    return toCsv(['Checked in', 'Member', 'Email'], rows.map((a) => [a.checkInAt, a.user?.name, a.user?.email]));
  },
  async classes(range) {
    const classes = await GymClass.find(range ? { startTime: range } : {}).sort({ startTime: 1 }).populate('trainer', 'name').lean();
    const attended = await Booking.aggregate([
      { $match: { gymClass: { $in: classes.map((c) => c._id) }, status: 'attended' } },
      { $group: { _id: '$gymClass', n: { $sum: 1 } } },
    ]);
    const attendedBy = new Map(attended.map((a) => [String(a._id), a.n]));
    return toCsv(
      ['Start', 'End', 'Title', 'Type', 'Trainer', 'Location', 'Capacity', 'Booked', 'Attended'],
      classes.map((c) => [c.startTime, c.endTime, c.title, c.type, c.trainer?.name, c.location, c.capacity, c.bookedCount, attendedBy.get(String(c._id)) ?? 0])
    );
  },
};

router.get('/reports/export', async (req, res) => {
  const report = String(req.query.report || 'payments');
  if (!REPORTS[report]) throw badRequest(`Unknown report "${report}".`);
  const csv = await REPORTS[report](dateRange(req.query));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="fitverse-${report}-${dayKey(new Date())}.csv"`);
  res.send(csv);
});

export default router;

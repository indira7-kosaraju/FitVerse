/**
 * Wipes the database and fills it with demo data.
 *   npm run seed
 * Every account's password is printed at the end.
 */
import mongoose from 'mongoose';
import { config } from './config.js';
import Attendance from './models/Attendance.js';
import Booking from './models/Booking.js';
import GymClass from './models/GymClass.js';
import Membership from './models/Membership.js';
import Payment from './models/Payment.js';
import Plan from './models/Plan.js';
import Progress from './models/Progress.js';
import Settings from './models/Settings.js';
import User from './models/User.js';
import Workout from './models/Workout.js';
import WorkoutPlan from './models/WorkoutPlan.js';

if (config.isProd) {
  console.error('Refusing to seed in production.');
  process.exit(1);
}

const PASSWORD = 'Password123';
const DAY = 24 * 60 * 60 * 1000;
const at = (daysFromToday, hour, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const pick = (arr, i) => arr[i % arr.length];

await mongoose.connect(config.mongoUri);
await mongoose.connection.dropDatabase();
await Promise.all([User, Plan, Membership, Booking, Settings].map((m) => m.syncIndexes()));

/* ---------- Users ---------- */
const mkUsers = (list) => Promise.all(list.map((u) => User.create({ password: PASSWORD, ...u })));

const [admin] = await mkUsers([{ name: 'Alex Admin', email: 'admin@fitverse.dev', role: 'admin', phone: '+1 555 0100' }]);

const trainers = await mkUsers([
  { name: 'Maya Chen', email: 'maya@fitverse.dev', role: 'trainer', bio: 'Strength coach with 10 years of experience helping people lift safely and get strong.', specializations: ['Strength', 'Hypertrophy', 'Nutrition'] },
  { name: 'Diego Ramirez', email: 'diego@fitverse.dev', role: 'trainer', bio: 'Former amateur boxer. High-energy HIIT and boxing conditioning.', specializations: ['HIIT', 'Boxing', 'Endurance'] },
  { name: 'Priya Nair', email: 'priya@fitverse.dev', role: 'trainer', bio: 'Certified yoga and pilates instructor focused on mobility and recovery.', specializations: ['Yoga', 'Pilates', 'Mobility'] },
  { name: 'Sam Okafor', email: 'sam@fitverse.dev', role: 'trainer', bio: 'Sports rehab specialist. Builds programs around injuries, not despite them.', specializations: ['Rehab', 'Mobility', 'Weight loss'] },
]);

const members = await mkUsers([
  { name: 'Jordan Lee', email: 'member@fitverse.dev', role: 'member', phone: '+1 555 0123', emergencyContact: { name: 'Casey Lee', phone: '+1 555 0199', relation: 'Partner' } },
  { name: 'Taylor Brooks', email: 'taylor@fitverse.dev', role: 'member' },
  { name: 'Riley Park', email: 'riley@fitverse.dev', role: 'member' },
  { name: 'Morgan Diaz', email: 'morgan@fitverse.dev', role: 'member' },
  { name: 'Avery Kim', email: 'avery@fitverse.dev', role: 'member' },
  { name: 'Quinn Patel', email: 'quinn@fitverse.dev', role: 'member' },
]);

/* ---------- Plans ---------- */
const plans = await Plan.create([
  { name: 'Day Pass', price: 15, durationDays: 1, description: 'Try us out for a day.', features: ['Full gym access', 'Locker room'] },
  { name: 'Monthly', price: 49, durationDays: 30, popular: true, description: 'Our most flexible membership.', features: ['Unlimited gym access', 'All group classes', 'Progress tracking'] },
  { name: 'Quarterly', price: 129, durationDays: 90, description: 'Save 12% versus monthly.', features: ['Everything in Monthly', '1 personal training session', 'Guest pass each month'] },
  { name: 'Annual', price: 449, durationDays: 365, description: 'Best value for committed members.', features: ['Everything in Quarterly', '4 personal training sessions', 'Free merch pack'] },
  { name: 'Student (legacy)', price: 29, durationDays: 30, active: false, features: ['Off-peak gym access'] },
]);

/* ---------- Memberships & payments ---------- */
const membershipSpecs = [
  { member: 0, plan: 1, startedDaysAgo: 12, status: 'active' },
  { member: 1, plan: 3, startedDaysAgo: 100, status: 'active' },
  { member: 2, plan: 2, startedDaysAgo: 20, status: 'frozen' },
  { member: 3, plan: 1, startedDaysAgo: 45, status: 'expired' },
  { member: 4, plan: 1, startedDaysAgo: 5, status: 'active' },
  { member: 5, plan: 2, startedDaysAgo: 40, status: 'cancelled' },
];
for (const spec of membershipSpecs) {
  const plan = plans[spec.plan];
  const start = new Date(Date.now() - spec.startedDaysAgo * DAY);
  const m = await Membership.create({
    user: members[spec.member]._id,
    plan: plan._id,
    status: spec.status,
    startDate: start,
    endDate: new Date(start.getTime() + plan.durationDays * DAY),
    ...(spec.status === 'cancelled' ? { cancelledAt: new Date(Date.now() - 3 * DAY) } : {}),
  });
  await Payment.create({ user: members[spec.member]._id, plan: plan._id, membership: m._id, amount: plan.price, status: 'paid', paidAt: start, createdAt: start });
  await User.updateOne({ _id: members[spec.member]._id }, { membership: m._id });
}
// Some history so revenue charts aren't empty.
for (let i = 1; i <= 11; i += 1) {
  const paidAt = new Date(Date.now() - i * 30 * DAY + (i % 5) * DAY);
  for (let j = 0; j < 1 + (i % 3); j += 1) {
    const plan = pick(plans.slice(0, 4), i + j);
    await Payment.create({ user: pick(members, i + j)._id, plan: plan._id, amount: plan.price, status: 'paid', paidAt, createdAt: paidAt });
  }
}
await Payment.create({ user: members[3]._id, plan: plans[1]._id, amount: 49, status: 'failed', createdAt: new Date(Date.now() - 2 * DAY) });

/* ---------- Classes: last week through the next two weeks ---------- */
const templates = [
  { title: 'Morning HIIT Blast', type: 'hiit', trainer: 1, hour: 7, mins: 45, capacity: 16, location: 'Studio A' },
  { title: 'Strength Foundations', type: 'strength', trainer: 0, hour: 9, mins: 60, capacity: 10, location: 'Weight Room' },
  { title: 'Lunchtime Yoga Flow', type: 'yoga', trainer: 2, hour: 12, mins: 50, capacity: 20, location: 'Studio B' },
  { title: 'Spin & Burn', type: 'cycling', trainer: 1, hour: 17, mins: 45, capacity: 18, location: 'Cycle Studio' },
  { title: 'Boxing Conditioning', type: 'boxing', trainer: 1, hour: 18, mins: 60, capacity: 12, location: 'Studio A' },
  { title: 'Mobility Reset', type: 'mobility', trainer: 3, hour: 19, mins: 40, capacity: 14, location: 'Studio B' },
  { title: 'Core Pilates', type: 'pilates', trainer: 2, hour: 8, mins: 50, capacity: 15, location: 'Studio B' },
];
const classes = [];
for (let day = -7; day <= 14; day += 1) {
  for (let k = 0; k < 3; k += 1) {
    const t = pick(templates, day + 7 + k * 2);
    const startTime = at(day, t.hour);
    classes.push({
      title: t.title,
      type: t.type,
      trainer: trainers[t.trainer]._id,
      location: t.location,
      capacity: t.capacity,
      description: `${t.title} with ${trainers[t.trainer].name.split(' ')[0]}.`,
      startTime,
      endTime: new Date(startTime.getTime() + t.mins * 60 * 1000),
    });
  }
}
const createdClasses = await GymClass.insertMany(classes);

/* ---------- Bookings ---------- */
const now = Date.now();
const activeMembers = [members[0], members[1], members[4]];
const counts = new Map();
let n = 0;
for (const c of createdClasses) {
  for (const [i, m] of activeMembers.entries()) {
    if ((n + i) % 3 !== 0) continue;
    const past = c.startTime.getTime() < now;
    const status = past ? ((n + i) % 4 === 0 ? 'no_show' : 'attended') : 'booked';
    await Booking.create({ user: m._id, gymClass: c._id, status });
    counts.set(String(c._id), (counts.get(String(c._id)) ?? 0) + 1);
  }
  n += 1;
}
// Make sure the demo member has something today and tomorrow.
for (const c of createdClasses.filter((x) => x.startTime.getTime() > now).slice(0, 2)) {
  if (!(await Booking.exists({ user: members[0]._id, gymClass: c._id }))) {
    await Booking.create({ user: members[0]._id, gymClass: c._id });
    counts.set(String(c._id), (counts.get(String(c._id)) ?? 0) + 1);
  }
}
await Promise.all([...counts].map(([id, count]) => GymClass.updateOne({ _id: id }, { bookedCount: count })));

/* ---------- Check-ins (for peak hours) ---------- */
const checkIns = [];
for (let d = 0; d < 30; d += 1) {
  for (const [i, m] of activeMembers.entries()) {
    if ((d + i) % 2) continue;
    const hour = pick([6, 7, 7, 12, 17, 18, 18, 19], d + i * 3);
    checkIns.push({ user: m._id, checkInAt: at(-d - 1, hour, (d * 7) % 60) });
  }
}
await Attendance.insertMany(checkIns);

/* ---------- Workouts & progress for the demo member ---------- */
const jordan = members[0];
const workouts = [];
for (let d = 1; d <= 28; d += 1) {
  if (d % 2 === 0 && d % 6 !== 0) continue;
  workouts.push({
    user: jordan._id,
    date: at(-d, 18),
    durationMin: 45 + (d % 4) * 10,
    notes: d % 5 === 0 ? 'Felt strong today.' : '',
    exercises: [
      { name: 'Back Squat', sets: [{ reps: 5, weightKg: 80 + d }, { reps: 5, weightKg: 80 + d }, { reps: 5, weightKg: 80 + d }] },
      { name: 'Bench Press', sets: [{ reps: 8, weightKg: 55 + d / 2 }, { reps: 8, weightKg: 55 + d / 2 }] },
    ],
  });
}
await Workout.insertMany(workouts);

const progress = [];
for (let w = 12; w >= 0; w -= 1) {
  progress.push({
    user: jordan._id,
    date: at(-w * 7, 12),
    weightKg: Math.round((84 - (12 - w) * 0.4) * 10) / 10,
    bodyFatPct: Math.round((22 - (12 - w) * 0.25) * 10) / 10,
    measurements: { chest: 102, waist: 90 - (12 - w) * 0.3, hips: 100, arms: 35, thighs: 58 },
  });
}
await Progress.insertMany(progress);

/* ---------- Workout plan from Maya to Jordan ---------- */
await WorkoutPlan.create({
  member: jordan._id,
  trainer: trainers[0]._id,
  title: '4-week strength block',
  weeks: Array.from({ length: 4 }, (_, w) => ({
    days: [
      { name: 'Lower body', completed: w === 0, exercises: [{ name: 'Back Squat', sets: 5, reps: 5 }, { name: 'Romanian Deadlift', sets: 3, reps: 8 }, { name: 'Walking Lunge', sets: 3, reps: 12, notes: 'Each leg' }] },
      { name: 'Upper body', completed: w === 0, exercises: [{ name: 'Bench Press', sets: 5, reps: 5 }, { name: 'Pull-up', sets: 4, reps: 8 }, { name: 'Overhead Press', sets: 3, reps: 8 }] },
      { name: 'Conditioning', completed: false, exercises: [{ name: 'Rower intervals', sets: 6, reps: 1, notes: '500 m hard, 90 s rest' }] },
    ],
  })),
});

/* ---------- Settings ---------- */
await Settings.create({
  gymName: 'FitVerse Downtown',
  email: 'hello@fitverse.dev',
  phone: '+1 555 0100',
  address: '123 Main Street, Springfield',
  website: 'https://fitverse.dev',
  currency: 'USD',
  hours: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
    day,
    open: day !== 'Sun',
    from: day === 'Sat' ? '08:00' : '06:00',
    to: day === 'Sat' ? '18:00' : '22:00',
  })),
  policies: { cancelWindowHours: 2, maxWeeklyBookings: 10, waitlist: false },
});

console.log('\nSeeded FitVerse demo data. All passwords:', PASSWORD);
console.table([
  { role: 'admin', email: admin.email },
  { role: 'trainer', email: trainers[0].email },
  { role: 'member', email: members[0].email },
]);
await mongoose.disconnect();

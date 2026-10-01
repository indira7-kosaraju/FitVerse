import Booking, { ACTIVE_BOOKING } from '../models/Booking.js';
import GymClass from '../models/GymClass.js';
import WorkoutPlan from '../models/WorkoutPlan.js';

/**
 * A trainer's clients are members who have booked one of the trainer's classes
 * or who have a workout plan from the trainer.
 */
export async function clientIdsOf(trainerId) {
  const classIds = await GymClass.find({ trainer: trainerId }).distinct('_id');
  const [fromBookings, fromPlans] = await Promise.all([
    Booking.find({ gymClass: { $in: classIds }, status: { $in: ACTIVE_BOOKING } }).distinct('user'),
    WorkoutPlan.find({ trainer: trainerId }).distinct('member'),
  ]);
  return [...new Set([...fromBookings, ...fromPlans].map(String))];
}

export async function isClientOf(trainerId, memberId) {
  if (await WorkoutPlan.exists({ trainer: trainerId, member: memberId })) return true;
  const classIds = await GymClass.find({ trainer: trainerId }).distinct('_id');
  return Boolean(await Booking.exists({ user: memberId, gymClass: { $in: classIds }, status: { $in: ACTIVE_BOOKING } }));
}

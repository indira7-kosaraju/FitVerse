import Settings from '../models/Settings.js';

const DEFAULT_POLICIES = { cancelWindowHours: 2, maxWeeklyBookings: 10, waitlist: false };

export async function getPolicies() {
  const s = await Settings.findOne({ key: 'gym' }).lean();
  return { ...DEFAULT_POLICIES, ...(s?.policies ?? {}) };
}

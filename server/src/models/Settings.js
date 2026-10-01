import mongoose from 'mongoose';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const hoursSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true },
    open: { type: Boolean, default: true },
    from: { type: String, match: [TIME_RE, 'Use HH:MM'] },
    to: { type: String, match: [TIME_RE, 'Use HH:MM'] },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    /** Singleton key. */
    key: { type: String, default: 'gym', unique: true },
    gymName: { type: String, required: [true, 'Gym name is required'], trim: true, minlength: [2, 'Gym name is too short'], maxlength: 100 },
    email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 300 },
    website: { type: String, trim: true },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'INR'], default: 'USD' },
    hours: [hoursSchema],
    policies: {
      cancelWindowHours: { type: Number, min: 0, max: 168, default: 2 },
      maxWeeklyBookings: { type: Number, min: 1, max: 50, default: 10 },
      waitlist: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

settingsSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.key;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Settings', settingsSchema);

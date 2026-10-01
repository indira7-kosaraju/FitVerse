import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gymClass: { type: mongoose.Schema.Types.ObjectId, ref: 'GymClass', required: true, index: true },
    status: { type: String, enum: ['booked', 'cancelled', 'attended', 'no_show'], default: 'booked' },
    cancelledAt: Date,
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, gymClass: 1 }, { unique: true });

/** Statuses that hold a spot in the class. */
export const ACTIVE_BOOKING = ['booked', 'attended', 'no_show'];

export default mongoose.model('Booking', bookingSchema);

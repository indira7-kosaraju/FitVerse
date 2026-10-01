import mongoose from 'mongoose';

export const CLASS_TYPES = ['hiit', 'strength', 'yoga', 'pilates', 'cycling', 'boxing', 'crossfit', 'dance', 'mobility'];

const gymClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [3, 'Title is too short'], maxlength: 100 },
    type: { type: String, required: [true, 'Type is required'], enum: { values: CLASS_TYPES, message: 'Pick a valid class type' } },
    description: { type: String, trim: true, maxlength: [1000, 'Description is too long'] },
    location: { type: String, required: [true, 'Location is required'], trim: true, maxlength: 100 },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'Trainer is required'], index: true },
    startTime: { type: Date, required: [true, 'Start time is required'], index: true },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator(v) {
          // `this` is the doc on save; on findOneAndUpdate validators we validate in the route instead.
          return !(this instanceof mongoose.Document) || !this.startTime || v > this.startTime;
        },
        message: 'End time must be after the start time',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [500, 'Capacity must be 500 or fewer'],
      validate: { validator: Number.isInteger, message: 'Capacity must be a whole number' },
    },
    /** Number of active ("booked"/"attended") bookings; maintained atomically by booking routes. */
    bookedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('GymClass', gymClassSchema);

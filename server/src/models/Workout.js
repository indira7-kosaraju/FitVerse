import mongoose from 'mongoose';

const setSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: [true, 'Reps are required'], min: [1, 'At least 1 rep'], max: [1000, 'Too many reps'] },
    weightKg: { type: Number, default: 0, min: [0, 'Weight cannot be negative'], max: [1000, 'Weight is too high'] },
  },
  { _id: false }
);

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Exercise name is required'], trim: true, maxlength: 100 },
    sets: {
      type: [setSchema],
      validate: { validator: (v) => v.length > 0, message: 'Add at least one set' },
    },
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: [true, 'Date is required'], index: true },
    durationMin: { type: Number, min: [1, 'At least 1 minute'], max: [600, 'Too long'] },
    notes: { type: String, trim: true, maxlength: [1000, 'Notes are too long'] },
    exercises: {
      type: [exerciseSchema],
      validate: { validator: (v) => v.length > 0, message: 'Add at least one exercise' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Workout', workoutSchema);

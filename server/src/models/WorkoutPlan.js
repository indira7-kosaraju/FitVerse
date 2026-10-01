import mongoose from 'mongoose';

const planExerciseSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Exercise name is required'], trim: true, maxlength: 100 },
  sets: { type: Number, required: [true, 'Sets are required'], min: [1, 'At least 1 set'], max: [100, 'Too many sets'] },
  reps: { type: Number, required: [true, 'Reps are required'], min: [1, 'At least 1 rep'], max: [1000, 'Too many reps'] },
  notes: { type: String, trim: true, maxlength: [200, 'Notes are too long'] },
});

const daySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Day name is required'], trim: true, maxlength: 60 },
  completed: { type: Boolean, default: false },
  exercises: {
    type: [planExerciseSchema],
    validate: { validator: (v) => v.length > 0, message: 'Add at least one exercise' },
  },
});

const weekSchema = new mongoose.Schema({
  days: { type: [daySchema], validate: { validator: (v) => v.length > 0, message: 'Add at least one day' } },
});

const workoutPlanSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    weeks: { type: [weekSchema], validate: { validator: (v) => v.length > 0, message: 'Add at least one week' } },
  },
  { timestamps: true }
);

export default mongoose.model('WorkoutPlan', workoutPlanSchema);

import mongoose from 'mongoose';

const cm = (max) => ({ type: Number, min: [0, 'Must be positive'], max: [max, `Must be ${max} or less`] });

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: [true, 'Date is required'], index: true },
    weightKg: { type: Number, required: [true, 'Weight is required'], min: [20, 'Must be at least 20 kg'], max: [400, 'Must be 400 kg or less'] },
    bodyFatPct: { type: Number, min: [2, 'Must be at least 2%'], max: [70, 'Must be 70% or less'] },
    measurements: {
      chest: cm(300),
      waist: cm(300),
      hips: cm(300),
      arms: cm(150),
      thighs: cm(200),
    },
    photoUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Progress', progressSchema);

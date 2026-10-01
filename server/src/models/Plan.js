import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    durationDays: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 day'],
      max: [3650, 'Duration is too long'],
      validate: { validator: Number.isInteger, message: 'Duration must be a whole number of days' },
    },
    features: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'Add at least one feature' },
    },
    active: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);

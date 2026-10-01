import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['paid', 'pending', 'failed', 'refunded'], default: 'paid', index: true },
    paidAt: Date,
    invoiceUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);

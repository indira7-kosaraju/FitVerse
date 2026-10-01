import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled', 'frozen'], default: 'active', index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    cancelledAt: Date,
  },
  { timestamps: true }
);

/** Lazily marks lapsed memberships as expired. Cheap; called before membership reads. */
membershipSchema.statics.expireLapsed = function expireLapsed() {
  return this.updateMany({ status: 'active', endDate: { $lt: new Date() } }, { $set: { status: 'expired' } });
};

export default mongoose.model('Membership', membershipSchema);

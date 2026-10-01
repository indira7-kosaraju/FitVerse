import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { EMAIL_RE, PHONE_RE } from '../utils/validate.js';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: [100, 'Name is too long'] },
    phone: { type: String, trim: true, match: [PHONE_RE, 'Enter a valid phone number'] },
    relation: { type: String, trim: true, maxlength: [50, 'Relation is too long'] },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name is too short'], maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RE, 'Enter a valid email'],
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['member', 'trainer', 'admin'], default: 'member', index: true },
    phone: {
      type: String,
      trim: true,
      validate: { validator: (v) => !v || PHONE_RE.test(v), message: 'Enter a valid phone number' },
    },
    avatarUrl: String,
    bio: { type: String, trim: true, maxlength: [500, 'Bio must be 500 characters or fewer'] },
    specializations: { type: [{ type: String, trim: true, maxlength: 50 }], default: undefined },
    emergencyContact: emergencyContactSchema,
    /** The member's most recent membership (kept in sync on subscribe). */
    membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
    /** Bumped on logout/password change to invalidate outstanding refresh tokens. */
    tokenVersion: { type: Number, default: 0, select: false },
    resetPasswordHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.resetPasswordHash;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);

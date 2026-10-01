import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkInAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Attendance', attendanceSchema);

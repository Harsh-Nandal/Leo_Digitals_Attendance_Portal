// models/Attendance.js
import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (IST)
    punchIn: { type: String },
    punchOut: { type: String },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ THIS IS THE KEY FIX
AttendanceSchema.index(
  { userId: 1, date: 1 },
  { unique: true }
);

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);

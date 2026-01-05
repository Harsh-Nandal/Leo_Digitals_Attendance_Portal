// pages/api/init-scheduler.js
import connectDB from "../../lib/mongodb";
import { startAttendanceScheduler } from "../../lib/attendanceScheduler";

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    initialized = true;
    await connectDB();
    await startAttendanceScheduler();
    console.log("✅ Scheduler initialized");
  }

  res.status(200).json({ ok: true });
}

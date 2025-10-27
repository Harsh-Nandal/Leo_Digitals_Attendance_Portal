// /pages/api/start-cron.js
import "../../../cron/attendanceNotifier.js"; // ✅ Only runs server-side

export default function handler(req, res) {
  res.status(200).json({ message: "✅ Cron jobs scheduled successfully!" });
}

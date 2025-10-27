// /pages/api/start-cron.js
import "../../lib/attendanceNotifier.js";

export default function handler(req, res) {
  res.status(200).json({ message: "✅ Cron jobs scheduled successfully!" });
}

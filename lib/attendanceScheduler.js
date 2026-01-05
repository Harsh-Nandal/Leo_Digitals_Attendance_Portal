import cron from "node-cron";
import Attendance from "../models/Attendance";
import User from "../models/User";
import { sendTelegramMessage } from "../utils/telegram";

process.env.TZ = "Asia/Kolkata";

let started = false;

export const startAttendanceScheduler = async () => {
  if (started) return;
  started = true;

  console.log("⏰ Attendance scheduler started (4 PM & 7 PM)");

  /* ============================
     🕓 4 PM ALERT (NOT FINAL)
  ============================ */
  cron.schedule("0 16 * * *", async () => {
    try {
      console.log("🕓 Running 4 PM attendance alert...");

      const todayYMD = new Date().toISOString().slice(0, 10);
      const students = await User.find({ role: "student" }).lean();

      const absent = [];

      for (const student of students) {
        const record = await Attendance.findOne({
          userId: student.userId,
          date: todayYMD,
        });

        if (!record || !record.punchIn || record.punchIn === "ABSENT") {
          absent.push(`${student.name} (${student.userId})`);
        }
      }

      const msg = absent.length
        ? `<b>🚨 Absent Students (4 PM)</b>\n\n${absent.join("\n")}`
        : "🎉 <b>All students have punched in by 4 PM!</b>";

      await sendTelegramMessage(msg);
    } catch (err) {
      console.error("❌ 4 PM cron error:", err);
    }
  });

  /* ============================
     🕖 7 PM FINALIZATION
  ============================ */
  cron.schedule("0 19 * * *", async () => {
    try {
      console.log("🕖 Running 7 PM attendance finalization...");

      const todayYMD = new Date().toISOString().slice(0, 10);
      const students = await User.find({ role: "student" }).lean();

      const present = [];
      const absent = [];

      for (const student of students) {
        let record = await Attendance.findOne({
          userId: student.userId,
          date: todayYMD,
        });

        if (record && record.punchIn && record.punchIn !== "ABSENT") {
          present.push(student.name);
        } else {
          if (!record) {
            await Attendance.create({
              userId: student.userId,
              name: student.name,
              role: student.role,
              date: todayYMD,
              punchIn: "ABSENT",
            });
          }
          absent.push(student.name);
        }
      }

      const report = `
<b>📅 Attendance Report</b>
<b>🗓 Date:</b> ${todayYMD}

<b>✅ Present (${present.length})</b>
${present.join("\n") || "-"}

<b>❌ Absent (${absent.length})</b>
${absent.join("\n") || "-"}
      `;

      await sendTelegramMessage(report);

      console.log("✅ 7 PM attendance finalized");
    } catch (err) {
      console.error("❌ 7 PM cron error:", err);
    }
  });
};

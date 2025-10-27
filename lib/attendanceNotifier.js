import cron from "node-cron";
import axios from "axios";
import connectDB from "./mongodb.js";
import User from "../models/User.js";

const TELEGRAM_BOT_TOKEN = "YOUR_TOKEN";
const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID";

async function sendTelegramMessage(text) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text });
    console.log("✅ Telegram message sent");
  } catch (err) {
    console.error("❌ Telegram send error:", err.message);
  }
}

async function getAbsentUsers() {
  await connectDB();
  const allUsers = await User.find({ role: "student" }).lean();
  const today = new Date().toDateString();
  return allUsers
    .filter(u => !u.lastPunchIn || new Date(u.lastPunchIn).toDateString() !== today)
    .map(u => `${u.name} (${u.userId})`);
}

export function startAttendanceCron() {
  // Prevent multiple schedules during hot reloads
  if (global.__attendanceCronStarted) return;
  global.__attendanceCronStarted = true;

  cron.schedule("0 16 * * *", async () => {
    console.log("🕓 Running 4 PM attendance alert...");
    const absent = await getAbsentUsers();
    const msg = absent.length
      ? `🚨 *Absent Students (4 PM)*\n${absent.join("\n")}`
      : "🎉 All students punched in by 4 PM!";
    await sendTelegramMessage(msg);
  });

  cron.schedule("0 19 * * *", async () => {
    console.log("🕖 Running 7 PM attendance alert...");
    const absent = await getAbsentUsers();
    const msg = absent.length
      ? `⚠️ *Absent Students (7 PM)*\n${absent.join("\n")}`
      : "✅ Everyone punched in by 7 PM!";
    await sendTelegramMessage(msg);
  });

  console.log("✅ Attendance notifier cron jobs scheduled (server).");
}

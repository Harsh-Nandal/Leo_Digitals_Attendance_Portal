// pages/api/punchAttendance.js
import axios from "axios";
import FormData from "form-data";
import connectDB from "../../lib/mongodb";
import Attendance from "../../models/Attendance";

export default async function handler(req, res) {
  try {
    await connectDB();

    const { userId, name, image } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: "User data missing",
      });
    }

    // Telegram Credentials
    const BOT_TOKEN = "8072882753:AAGXU1N6E3ZDGHb91oxCWUaBZSRHaSvIzSY"; // Move to .env for security
    const CHAT_ID = "6693684914"; // Your Telegram ID or group/channel ID

    // const BOT_TOKEN = "8430452006:AAEgmLpUCqPCLLUaK-WxWvyz5iMXPOAgef0";
    // const CHAT_ID = 6251710308;

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const fullTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Get today's attendance entry
    let todayRecord = await Attendance.findOne({ userId, date });

    // -----------------------------------------
    // ❌ If already punched IN + OUT → Block
    // -----------------------------------------
    if (todayRecord && todayRecord.punchIn && todayRecord.punchOut) {
      return res.status(400).json({
        success: false,
        punchType: "none",
        message: "You have already completed today's attendance.",
      });
    }

    // -----------------------------------------
    // AUTO Punch Logic
    // -----------------------------------------
    let finalPunch;

    if (!todayRecord) {
      finalPunch = "in"; // First punch
    } else if (todayRecord.punchIn && !todayRecord.punchOut) {
      finalPunch = "out"; // Punch-out
    } else {
      finalPunch = "in"; // Should not happen (blocked above)
    }

    // -----------------------------------------
    // DATABASE SAVE
    // -----------------------------------------
    if (!todayRecord) {
      todayRecord = await Attendance.create({
        userId,
        name,
        role: "student",
        date,
        punchIn: finalPunch === "in" ? timeStr : "",
        punchOut: finalPunch === "out" ? timeStr : "",
        recordedAt: now,
      });
    } else if (finalPunch === "out") {
      todayRecord.punchOut = timeStr;
      todayRecord.recordedAt = now;
      await todayRecord.save();
    }

    // -----------------------------------------
    // SEND TELEGRAM TEXT
    // -----------------------------------------
    try {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text:
          `📌 Attendance Update\n\n` +
          `User: ${name}\n` +
          `ID: ${userId}\n` +
          `Punch: ${finalPunch.toUpperCase()}\n` +
          `Time: ${fullTime}`,
      });
    } catch (error) {
      console.error("Telegram text error:", error.message);
    }

    // -----------------------------------------
    // SEND TELEGRAM PHOTO
    // -----------------------------------------
    if (image && image.startsWith("data:image/")) {
      try {
        const base64 = image.split(",")[1];
        const buffer = Buffer.from(base64, "base64");

        const formData = new FormData();
        formData.append("chat_id", CHAT_ID);
        formData.append("caption", `${name} (${userId}) - Punch ${finalPunch}`);
        formData.append("photo", buffer, {
          filename: "punch.jpg",
          contentType: "image/jpeg",
        });

        await axios.post(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
          formData,
          { headers: formData.getHeaders() }
        );
      } catch (error) {
        console.error("Telegram photo error:", error.message);
      }
    }

    // -----------------------------------------
    // API RESPONSE
    // -----------------------------------------
    return res.status(200).json({
      success: true,
      punchType: finalPunch,
      message: `Punch ${finalPunch.toUpperCase()} recorded successfully`,
    });
  } catch (err) {
    console.error("Punch Error:", err);
    return res.status(500).json({
      success: false,
      message: "Punch failed!",
    });
  }
}
// pages/api/submit-attendance.js
// Set process TZ early; restart your Render service after deploying.
process.env.TZ = process.env.TZ || "Asia/Kolkata";

import connectDB from "../../lib/mongodb";
import Attendance from "../../models/Attendance";
import User from "../../models/User";
import moment from "moment-timezone";

const APP_TZ = "Asia/Kolkata";
const MIN_REPEAT_SECONDS =
  process.env.MIN_REPEAT_SECONDS !== undefined &&
  process.env.MIN_REPEAT_SECONDS !== ""
    ? Number(process.env.MIN_REPEAT_SECONDS)
    : 60;
const EFFECTIVE_MIN_REPEAT_SECONDS = Math.max(30, MIN_REPEAT_SECONDS);

// Helpers
const nowIST = () => moment().tz(APP_TZ); // reliable IST moment
const make12 = (m) => m.format("hh:mm:ss A"); // canonical "02:09:11 PM"
const makeIstIso = (m) => m.format(); // ISO with +05:30

function parseDateTimeFlexible(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // try 12-hour with AM/PM
  let mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD hh:mm:ss A", APP_TZ);
  if (mm.isValid()) return mm;
  // try 24-hour
  mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm:ss", APP_TZ);
  if (mm.isValid()) return mm;
  // fallback
  mm = moment.tz(`${dateStr} ${timeStr}`, APP_TZ);
  return mm.isValid() ? mm : null;
}

function secondsToHhMmSs(sec) {
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// Normalize stored strings to canonical format and persist if changed
async function normalizeRecordTimes(record) {
  let changed = false;
  if (record?.punchIn) {
    const inM = parseDateTimeFlexible(record.date, record.punchIn);
    if (inM) {
      const canonical = make12(inM);
      if (canonical !== record.punchIn) {
        record.punchIn = canonical;
        changed = true;
      }
    }
  }
  if (record?.punchOut) {
    const outM = parseDateTimeFlexible(record.date, record.punchOut);
    if (outM) {
      const canonicalOut = make12(outM);
      if (canonicalOut !== record.punchOut) {
        record.punchOut = canonicalOut;
        changed = true;
      }
    }
  }
  if (changed) {
    try {
      await record.save();
    } catch (e) {
      console.warn("[normalizeRecordTimes] save failed:", e);
    }
  }
  return record;
}

// Handler (now supports both POST for submission and GET for fetching/downloading)
export default async function handler(req, res) {
  try {
    await connectDB();

    // ✅ HARD FIX: prevent duplicate userId + date forever
    await Attendance.collection.createIndex(
      { userId: 1, date: 1 },
      { unique: true }
    );

    if (req.method === "POST") {
      const {
        userId,
        name: reqName,
        role: reqRole,
        action: rawAction,
      } = req.body || {};
      const action = (rawAction || "in").toLowerCase();

      if (!userId) {
        return res.status(400).json({ message: "Missing userId" });
      }

      const uidStr = String(userId);
      const today = nowIST().format("YYYY-MM-DD");

      const user = await User.findOne({ userId: uidStr })
        .lean()
        .catch(() => null);
      const name = reqName?.trim() || user?.name || "";
      const role = reqRole?.trim() || user?.role || "";

      if (action === "in") {
        const nowM = nowIST();
        const punchInStr = make12(nowM);

        try {
          const doc = await Attendance.findOneAndUpdate(
            { userId: uidStr, date: today },
            {
              $setOnInsert: {
                userId: uidStr,
                name,
                role,
                date: today,
                punchIn: punchInStr,
                recordedAt: nowM.toDate(),
                recordedAtIst: makeIstIso(nowM),
              },
            },
            { upsert: true, new: true }
          );

          if (doc.punchIn !== punchInStr) {
            return res.status(200).json({
              message: "Already Punched In",
              status: "Punched In",
              date: doc.date,
              punchIn: doc.punchIn,
              punchOut: doc.punchOut ?? null,
            });
          }

          return res.status(200).json({
            message: "Punched In Successfully",
            status: "Punched In",
            date: today,
            punchIn: punchInStr,
            punchOut: null,
            name,
            role,
          });
        } catch (err) {
          if (err.code === 11000) {
            const existing = await Attendance.findOne({
              userId: uidStr,
              date: today,
            });
            return res.status(200).json({
              message: "Already Punched In",
              status: "Punched In",
              date: existing.date,
              punchIn: existing.punchIn,
              punchOut: existing.punchOut ?? null,
            });
          }
          throw err;
        }
      }

     

      /* ============================
     ACTION: OUT  ✅ SAFE
     ============================ */
      if (action === "out") {
        const record = await Attendance.findOne({
          userId: uidStr,
          date: today,
        });

        if (!record || !record.punchIn) {
          return res.status(400).json({
            message: "No punch-in found for today. Please punch in first.",
          });
        }

        if (record.punchOut) {
          return res.status(200).json({
            message: "Already Punched Out",
            status: "Punched Out",
            date: record.date,
            punchIn: record.punchIn,
            punchOut: record.punchOut,
          });
        }

        const nowM = nowIST();

        // normalize punchIn before duration calc
        const parsedIn = parseDateTimeFlexible(record.date, record.punchIn);
        if (!parsedIn) {
          return res.status(500).json({
            message: "Server error: invalid punch-in time",
          });
        }

        const elapsedSec = Math.floor(
          (nowM.valueOf() - parsedIn.valueOf()) / 1000
        );

        if (elapsedSec < EFFECTIVE_MIN_REPEAT_SECONDS) {
          return res.status(429).json({
            message: `Too soon to punch out. Wait ${
              EFFECTIVE_MIN_REPEAT_SECONDS - elapsedSec
            } seconds.`,
            status: "Punched In",
            punchIn: record.punchIn,
            punchOut: null,
            waitSeconds: EFFECTIVE_MIN_REPEAT_SECONDS - elapsedSec,
          });
        }

        const outStr = make12(nowM);
        record.punchOut = outStr;
        record.recordedAt = nowM.toDate();
        record.recordedAtIst = makeIstIso(nowM);
        if (name) record.name = name;
        if (role) record.role = role;

        await record.save();

        const duration = secondsToHhMmSs(elapsedSec);

        return res.status(200).json({
          message: "Punched Out Successfully",
          status: "Punched Out",
          date: record.date,
          punchIn: record.punchIn,
          punchOut: outStr,
          duration,
          name: record.name,
          role: record.role,
        });
      }

      return res.status(400).json({
        message: "Invalid action. Use action: 'in' or 'out'.",
      });
    } else if (req.method === "GET") {
      // Updated GET logic for fetching and downloading PDFs (return JSON for client-side generation)
      const { userId, type = "weekly", month, download } = req.query;

      if (!userId) return res.status(400).json({ message: "Missing userId" });

      const uidStr = String(userId);

      // FIXED: Use aggregation to fetch and deduplicate records by date (keep most recent per date)
      const uniqueRecords = await Attendance.aggregate([
        { $match: { userId: uidStr } },
        { $sort: { date: 1, recordedAt: -1 } }, // Sort by date asc, then recordedAt desc
        { $group: { _id: "$date", record: { $first: "$$ROOT" } } }, // Group by date, take first (most recent)
        { $replaceRoot: { newRoot: "$record" } },
        { $sort: { date: 1 } }, // Final sort by date asc
      ]);

      // Fetch student details for PDF
      const student = await User.findOne({ userId: uidStr })
        .lean()
        .catch(() => ({}));

      // console.log(
      //   `Query params: userId=${userId}, type=${type}, month=${month}, download=${download}`
      // );
      // console.log(
      //   `Fetched and deduplicated to ${uniqueRecords.length} records for userId: ${userId}`,
      //   uniqueRecords.map((r) => ({ date: r.date, punchIn: r.punchIn }))
      // );

      let filteredRecords = uniqueRecords;
      let absences = 0; // Initialize absences

      // Apply filtering only for JSON responses (not for PDF downloads, to show full history)
      if (download !== "pdf") {
        if (type === "weekly") {
          // FIXED: Calculate last 7 days using IST (from today back 7 days)
          const now = nowIST();
          const endDate = now.clone().endOf("day");
          const startDate = now.clone().subtract(6, "days").startOf("day");

          const weeklyStart = startDate.format("YYYY-MM-DD");
          const weeklyEnd = endDate.format("YYYY-MM-DD");

          console.log(
            `Weekly range (last 7 days in IST): ${weeklyStart} to ${weeklyEnd}`
          );

          filteredRecords = uniqueRecords.filter((record) => {
            const recordDate = record.date;
            const isInRange =
              recordDate >= weeklyStart && recordDate <= weeklyEnd;
            console.log(
              `Checking record: date=${recordDate}, in range ${weeklyStart} to ${weeklyEnd}? ${isInRange}`
            );
            return isInRange;
          });
        } else if (type === "monthly") {
          // FIXED: If no month specified, use current month (e.g., November); otherwise, use provided month
          const targetMonth = month || nowIST().format("YYYY-MM");
          filteredRecords = uniqueRecords.filter((record) =>
            record.date.startsWith(targetMonth)
          );
          // FIXED: Calculate absences correctly by considering only days 1-28 as working days (cap at 28)
          const targetMonthMoment = moment(targetMonth, "YYYY-MM");
          const daysInMonth = targetMonthMoment.daysInMonth();
          const effectiveDays = Math.min(daysInMonth, 28); // Cap at 28 to exclude 29, 30, 31
          absences = Math.max(0, effectiveDays - filteredRecords.length);
          console.log(
            `Monthly range (current or specified month): ${targetMonth}, effective days: ${effectiveDays}, records: ${filteredRecords.length}, absences: ${absences}`
          );
        }
      }

      

      if (download === "pdf") {
        // Return JSON data for client-side PDF generation (full unique records + student + absences)
        res.status(200).json({ records: uniqueRecords, student, absences });
      } else {
        // Return JSON data (with filtering applied + absences for monthly)
        res.status(200).json({ records: filteredRecords, absences });
      }
    } else {
      res.status(405).json({ message: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("[Submit Attendance API Error]", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: err?.message ?? String(err),
    });
  }
}
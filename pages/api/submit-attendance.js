// pages/api/submit-attendance.js
import connectDB from "../../lib/mongodb";
import Attendance from "../../models/Attendance";
import User from "../../models/User";
import moment from "moment-timezone";

const APP_TZ = "Asia/Kolkata";
const MIN_REPEAT_SECONDS =
  process.env.MIN_REPEAT_SECONDS !== undefined && process.env.MIN_REPEAT_SECONDS !== ""
    ? Number(process.env.MIN_REPEAT_SECONDS)
    : 60;
// enforce at least 30 seconds minimum
const EFFECTIVE_MIN_REPEAT_SECONDS = Math.max(30, MIN_REPEAT_SECONDS);

// Helpers ---------------------------------------------------------
const nowIST = () => moment().tz(APP_TZ);

// Produce 12-hour display (with AM/PM)
const make12 = (m) => m.format("hh:mm:ss A"); // "08:30:12 AM"

// Accept either stored 12-hour ("hh:mm:ss A") or 24-hour ("HH:mm:ss")
// Return a moment in APP_TZ
function parseDateTimeFlexible(dateStr, timeStr) {
  if (!timeStr || !dateStr) return null;

  // try 12-hour parse first
  let mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD hh:mm:ss A", APP_TZ);
  if (mm.isValid()) return mm;

  // try 24-hour parse if 12-hour failed
  mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm:ss", APP_TZ);
  if (mm.isValid()) return mm;

  // try generic parse fallback
  mm = moment.tz(`${dateStr} ${timeStr}`, APP_TZ);
  return mm.isValid() ? mm : null;
}

// Format duration seconds to HH:MM:SS
function secondsToHhMmSs(sec) {
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ----------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { userId, name: reqName, role: reqRole } = req.body || {};
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const uidStr = String(userId);
    const user = await User.findOne({ userId: uidStr }).lean().catch(() => null);

    const name = typeof reqName === "string" && reqName.trim() ? reqName.trim() : user?.name ?? "";
    const role = typeof reqRole === "string" && reqRole.trim() ? reqRole.trim() : user?.role ?? "";

    const today = nowIST().format("YYYY-MM-DD");

    // find today's record
    let record = await Attendance.findOne({ userId: uidStr, date: today });

    // 1) No record -> Punch In
    if (!record) {
      const nowM = nowIST();
      const punchInStr = make12(nowM); // store 12-hour
      const newRec = new Attendance({
        userId: uidStr,
        name,
        role,
        date: today,
        punchIn: punchInStr,
        recordedAt: nowM.toDate(),
      });
      await newRec.save();

      return res.status(200).json({
        message: "Punched In Successfully",
        status: "Punched In",
        date: newRec.date,
        punchIn: newRec.punchIn,
        punchOut: null,
        duration: null,
        name: newRec.name,
        role: newRec.role,
      });
    }

    // 2) Repair missing punchIn (only if no punchOut)
    if ((!record.punchIn || String(record.punchIn).trim() === "") && !record.punchOut) {
      const nowM = nowIST();
      record.punchIn = make12(nowM);
      if (name) record.name = name;
      if (role) record.role = role;
      record.recordedAt = nowM.toDate();
      await record.save();

      return res.status(200).json({
        message: "Punched In (repaired missing punchIn)",
        status: "Punched In",
        date: record.date,
        punchIn: record.punchIn,
        punchOut: null,
        duration: null,
        name: record.name,
        role: record.role,
      });
    }

    // 3) If punched in but not punched out -> try to punch out
    if (record.punchIn && !record.punchOut) {
      // Refresh record
      record = await Attendance.findOne({ userId: uidStr, date: today });

      // fallback if still missing punchIn
      if (!record || !record.punchIn) {
        const nowM = nowIST();
        const punchInStr = make12(nowM);
        if (!record) {
          const newRec = new Attendance({
            userId: uidStr,
            name,
            role,
            date: today,
            punchIn: punchInStr,
            recordedAt: nowM.toDate(),
          });
          await newRec.save();
          return res.status(200).json({
            message: "Punched In (created fallback record)",
            status: "Punched In",
            date: newRec.date,
            punchIn: newRec.punchIn,
            punchOut: null,
            duration: null,
            name: newRec.name,
            role: newRec.role,
          });
        } else {
          record.punchIn = punchInStr;
          if (name) record.name = name;
          if (role) record.role = role;
          record.recordedAt = nowM.toDate();
          await record.save();
          return res.status(200).json({
            message: "Punched In (repaired missing punchIn)",
            status: "Punched In",
            date: record.date,
            punchIn: record.punchIn,
            punchOut: null,
            duration: null,
            name: record.name,
            role: record.role,
          });
        }
      }

      // Use a single nowMoment for elapsed-check + punchOut storage
      const nowMoment = nowIST();

      // Parse stored punchIn flexibly (12h or 24h)
      const inMoment = parseDateTimeFlexible(record.date, record.punchIn);
      if (!inMoment) {
        // cannot parse stored punchIn -> return an error
        console.error("[submit-attendance] could not parse stored punchIn:", record.punchIn);
        return res.status(500).json({ message: "Server: cannot parse stored punchIn time." });
      }

      const elapsedSec = Math.floor(Math.max(0, nowMoment.valueOf() - inMoment.valueOf()) / 1000);

      if (elapsedSec < EFFECTIVE_MIN_REPEAT_SECONDS) {
        return res.status(429).json({
          message: ``,
          status: "Punched In",
          date: record.date,
          punchIn: record.punchIn,
          punchOut: null,
          duration: null,
          name: record.name,
          role: record.role,
        });
      }

      // Now set punchOut using the same nowMoment and 12-hour format
      const outStr = make12(nowMoment);
      const update = {
        punchOut: outStr,
        recordedAt: nowMoment.toDate(),
      };
      if (name) update.name = name;
      if (role) update.role = role;

      const updated = await Attendance.findOneAndUpdate(
        {
          userId: uidStr,
          date: today,
          punchOut: { $in: [null, undefined, ""] },
          // match by original stored punchIn string to avoid races
          punchIn: record.punchIn,
        },
        { $set: update },
        { new: true }
      );

      if (!updated) {
        // race lost or another writer beat us - return latest
        const latest = await Attendance.findOne({ userId: uidStr, date: today });
        let computedDuration = null;
        try {
          if (latest?.punchIn && latest?.punchOut) {
            const inM = parseDateTimeFlexible(latest.date, latest.punchIn);
            const outM = parseDateTimeFlexible(latest.date, latest.punchOut);
            if (inM && outM) {
              const diff = Math.max(0, Math.floor((outM.valueOf() - inM.valueOf()) / 1000));
              computedDuration = secondsToHhMmSs(diff);
            }
          }
        } catch {
          computedDuration = null;
        }

        return res.status(200).json({
          message: "Already Punched Out (race resolved)",
          status: "Punched Out",
          date: latest.date,
          punchIn: latest.punchIn,
          punchOut: latest.punchOut ?? null,
          duration: computedDuration,
          name: latest.name,
          role: latest.role,
        });
      }

      // success -> compute duration
      let duration = null;
      try {
        const inM2 = parseDateTimeFlexible(updated.date, updated.punchIn);
        const outM2 = parseDateTimeFlexible(updated.date, updated.punchOut);
        if (inM2 && outM2) {
          const diff = Math.max(0, Math.floor((outM2.valueOf() - inM2.valueOf()) / 1000));
          duration = secondsToHhMmSs(diff);
        }
      } catch {
        duration = null;
      }

      return res.status(200).json({
        message: "Punched Out Successfully",
        status: "Punched Out",
        date: updated.date,
        punchIn: updated.punchIn,
        punchOut: updated.punchOut,
        duration,
        name: updated.name,
        role: updated.role,
      });
    }

    // 4) Already has both -> return with computed duration
    let computedDuration = null;
    try {
      if (record.punchIn && record.punchOut) {
        const inM = parseDateTimeFlexible(record.date, record.punchIn);
        const outM = parseDateTimeFlexible(record.date, record.punchOut);
        if (inM && outM) {
          const diff = Math.max(0, Math.floor((outM.valueOf() - inM.valueOf()) / 1000));
          computedDuration = secondsToHhMmSs(diff);
        }
      }
    } catch {
      computedDuration = null;
    }

    return res.status(200).json({
      message: "Already Punched Out",
      status: "Punched Out",
      date: record.date,
      punchIn: record.punchIn,
      punchOut: record.punchOut,
      duration: computedDuration,
      name: record.name,
      role: record.role,
    });
  } catch (err) {
    console.error("[Submit Attendance API Error]", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err?.message ?? String(err),
    });
  }
}

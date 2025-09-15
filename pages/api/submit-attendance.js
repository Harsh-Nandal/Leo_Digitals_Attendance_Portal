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
// Use moment.tz with Date.now() to produce a moment *in IST reliably*
const nowIST = () => moment.tz(Date.now(), APP_TZ);

// Produce 12-hour display (with AM/PM, uppercase)
const make12 = (m) => m.format("hh:mm:ss A"); // e.g. "01:56:11 PM"

// Accept either stored 12-hour ("hh:mm:ss A") or 24-hour ("HH:mm:ss")
// Return a moment in APP_TZ or null
function parseDateTimeFlexible(dateStr, timeStr) {
  if (!timeStr || !dateStr) return null;

  // try 12-hour parse first
  let mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD hh:mm:ss A", APP_TZ);
  if (mm.isValid()) return mm;

  // try 24-hour parse if 12-hour failed
  mm = moment.tz(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm:ss", APP_TZ);
  if (mm.isValid()) return mm;

  // try generic parse fallback (less preferred)
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

    const { userId, name: reqName, role: reqRole, action: rawAction } = req.body || {};
    // default action = 'in' (avoid accidental immediate punch-out)
    const action = (rawAction || "in").toString().toLowerCase();

    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const uidStr = String(userId);
    const user = await User.findOne({ userId: uidStr }).lean().catch(() => null);

    const name = typeof reqName === "string" && reqName.trim() ? reqName.trim() : user?.name ?? "";
    const role = typeof reqRole === "string" && reqRole.trim() ? reqRole.trim() : user?.role ?? "";

    const today = nowIST().format("YYYY-MM-DD");

    // find today's record
    let record = await Attendance.findOne({ userId: uidStr, date: today });

    // helper to build response shape
    const buildResponse = (msg, statusLabel, rec, duration = null, extra = {}) => ({
      message: msg,
      status: statusLabel,
      date: rec?.date ?? today,
      punchIn: rec?.punchIn ?? null,
      punchOut: rec?.punchOut ?? null,
      duration,
      name: rec?.name ?? name,
      role: rec?.role ?? role,
      ...extra,
    });

    // ACTION: IN (create or return info)
    if (action === "in") {
      if (!record) {
        const nowM = nowIST();
        const punchInStr = make12(nowM);
        const newRec = new Attendance({
          userId: uidStr,
          name,
          role,
          date: today,
          punchIn: punchInStr,
          recordedAt: nowM.toDate(),
        });
        await newRec.save();
        return res.status(200).json(buildResponse("Punched In Successfully", "Punched In", newRec));
      }

      if (record.punchIn && !record.punchOut) {
        const inM = parseDateTimeFlexible(record.date, record.punchIn);
        const nowM = nowIST();
        const elapsedSec = inM ? Math.floor(Math.max(0, nowM.valueOf() - inM.valueOf()) / 1000) : null;
        return res.status(200).json({
          ...buildResponse("Already Punched In", "Punched In", record),
          elapsedSec,
          waitSeconds: elapsedSec !== null ? Math.max(0, EFFECTIVE_MIN_REPEAT_SECONDS - elapsedSec) : null,
        });
      }

      if (record.punchIn && record.punchOut) {
        return res.status(200).json(buildResponse("Already Punched Out (today)", "Punched Out", record));
      }
    }

    // ACTION: OUT (explicit punch out)
    if (action === "out") {
      if (!record) {
        return res.status(400).json({ message: "No punch-in found for today. Please punch in first." });
      }
      if (!record.punchIn) {
        const nowM = nowIST();
        record.punchIn = make12(nowM);
        if (name) record.name = name;
        if (role) record.role = role;
        record.recordedAt = nowM.toDate();
        await record.save();
        return res.status(200).json(buildResponse("Repaired missing punchIn", "Punched In", record));
      }
      if (record.punchOut) {
        return res.status(200).json(buildResponse("Already Punched Out", "Punched Out", record));
      }

      // single nowMoment used for elapsed-check + punchOut storage (IST)
      const nowMoment = nowIST();

      const inMoment = parseDateTimeFlexible(record.date, record.punchIn);
      if (!inMoment) {
        console.error("[submit-attendance] could not parse stored punchIn:", record.punchIn);
        return res.status(500).json({ message: "Server: cannot parse stored punchIn time." });
      }

      const elapsedSec = Math.floor(Math.max(0, nowMoment.valueOf() - inMoment.valueOf()) / 1000);

      if (elapsedSec < EFFECTIVE_MIN_REPEAT_SECONDS) {
        const wait = EFFECTIVE_MIN_REPEAT_SECONDS - elapsedSec;
        return res.status(429).json({
          message: `Too soon to punch out: you punched in ${elapsedSec} second(s) ago. Please wait ${wait} more second(s).`,
          status: "Punched In",
          date: record.date,
          punchIn: record.punchIn,
          punchOut: null,
          duration: null,
          name: record.name,
          role: record.role,
          waitSeconds: wait,
        });
      }

      // Now set punchOut using the same nowMoment and 12-hour format
      const outStr = make12(nowMoment);
      const update = { punchOut: outStr, recordedAt: nowMoment.toDate() };
      if (name) update.name = name;
      if (role) update.role = role;

      const updated = await Attendance.findOneAndUpdate(
        {
          userId: uidStr,
          date: today,
          punchOut: { $in: [null, undefined, ""] },
          punchIn: record.punchIn, // match by original stored punchIn
        },
        { $set: update },
        { new: true }
      );

      if (!updated) {
        // race lost — return latest
        const latest = await Attendance.findOne({ userId: uidStr, date: today });
        let computedDuration = null;
        try {
          if (latest?.punchIn && latest?.punchOut) {
            const inM2 = parseDateTimeFlexible(latest.date, latest.punchIn);
            const outM2 = parseDateTimeFlexible(latest.date, latest.punchOut);
            if (inM2 && outM2) {
              const diff = Math.max(0, Math.floor((outM2.valueOf() - inM2.valueOf()) / 1000));
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

      return res.status(200).json(buildResponse("Punched Out Successfully", "Punched Out", updated, duration));
    }

    // fallback
    return res.status(400).json({ message: "Invalid action. Use action:'in' or action:'out'." });
  } catch (err) {
    console.error("[Submit Attendance API Error]", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err?.message ?? String(err),
    });
  }
}

// pages/api/submit-attendance.js
// Set process TZ early; restart your Render service after deploying.
process.env.TZ = process.env.TZ || "Asia/Kolkata";

import connectDB from "../../lib/mongodb";
import Attendance from "../../models/Attendance";
import User from "../../models/User";
import moment from "moment-timezone";

const APP_TZ = "Asia/Kolkata";
const MIN_REPEAT_SECONDS =
  process.env.MIN_REPEAT_SECONDS !== undefined && process.env.MIN_REPEAT_SECONDS !== ""
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

// Handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    await connectDB();

    const { userId, name: reqName, role: reqRole, action: rawAction } = req.body || {};
    const action = (rawAction || "in").toString().toLowerCase();

    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const uidStr = String(userId);
    const user = await User.findOne({ userId: uidStr }).lean().catch(() => null);
    const name = typeof reqName === "string" && reqName.trim() ? reqName.trim() : user?.name ?? "";
    const role = typeof reqRole === "string" && reqRole.trim() ? reqRole.trim() : user?.role ?? "";

    const today = nowIST().format("YYYY-MM-DD");

    // find & normalize existing record
    let record = await Attendance.findOne({ userId: uidStr, date: today });
    if (record) {
      await normalizeRecordTimes(record);
      record = await Attendance.findOne({ userId: uidStr, date: today });
    }

    // debug logging (check Render logs)
    const debugNow = nowIST();
    console.log(`[attendance] server nowIST: ${debugNow.format()} (offset ${debugNow.format("Z")}) action=${action} user=${uidStr}`);

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

    // ACTION: IN
    if (action === "in") {
      if (!record) {
        const nowM = nowIST();
        const punchInStr = make12(nowM);
        const recordedAtIst = makeIstIso(nowM);
        const newRec = new Attendance({
          userId: uidStr,
          name,
          role,
          date: today,
          punchIn: punchInStr,
          recordedAt: nowM.toDate(),
          recordedAtIst,
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

    // ACTION: OUT
    if (action === "out") {
      if (!record) return res.status(400).json({ message: "No punch-in found for today. Please punch in first." });

      if (!record.punchIn) {
        const nowM = nowIST();
        record.punchIn = make12(nowM);
        if (name) record.name = name;
        if (role) record.role = role;
        record.recordedAt = nowM.toDate();
        record.recordedAtIst = makeIstIso(nowM);
        await record.save();
        return res.status(200).json(buildResponse("Repaired missing punchIn", "Punched In", record));
      }

      if (record.punchOut) return res.status(200).json(buildResponse("Already Punched Out", "Punched Out", record));

      // single nowMoment for elapsed-check and saved punchOut (IST)
      const nowMoment = nowIST();

      // --- NEW: ensure stored punchIn is canonical BEFORE using it ---
      const parsedIn = parseDateTimeFlexible(record.date, record.punchIn);
      if (!parsedIn) {
        console.error("[submit-attendance] could not parse stored punchIn:", record.punchIn);
        return res.status(500).json({ message: "Server: cannot parse stored punchIn time." });
      }
      const canonicalPunchIn = make12(parsedIn);
      // if canonical differs, persist the canonical value now so DB matches punchOut format
      if (canonicalPunchIn !== record.punchIn) {
        try {
          await Attendance.updateOne({ _id: record._id }, { $set: { punchIn: canonicalPunchIn } });
          // update local record too
          record.punchIn = canonicalPunchIn;
        } catch (e) {
          console.warn("[submit-attendance] failed to persist canonical punchIn:", e);
        }
      }

      const elapsedSec = Math.floor(Math.max(0, nowMoment.valueOf() - parsedIn.valueOf()) / 1000);
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

      // Prepare update (store punchOut canonical + recordedAtIst)
      const outStr = make12(nowMoment);
      const update = {
        punchOut: outStr,
        recordedAt: nowMoment.toDate(),
        recordedAtIst: makeIstIso(nowMoment),
      };
      if (name) update.name = name;
      if (role) update.role = role;

      // Atomic update by userId + date + empty punchOut
      const updated = await Attendance.findOneAndUpdate(
        {
          userId: uidStr,
          date: today,
          punchOut: { $in: [null, undefined, ""] },
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

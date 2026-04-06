import connectDB from "../../../lib/mongodb";
import Attendance from "../../../models/Attendance";
// Assuming you have a Student model; if not, replace with your user/student model
import Student from "../../../models/User";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method Not Allowed" });

  try {
    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    if (token !== process.env.ADMIN_TOKEN)
      return res.status(401).json({ message: "Invalid token" });

    await connectDB();

    // Query params
    const { userId, type, month, date } = req.query;
    console.log(`Query params: userId=${userId}, type=${type}, month=${month}, date=${date}`); // DEBUG

    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    // Helper to validate and parse date
    const parseDate = (dateStr) => {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d; // Return null if invalid
    };

    // Helper to generate all days in a range (now always include all days, including Sundays, for both weekly and monthly)
    const generateDaysInRange = (start, end) => {
      const days = [];
      const current = new Date(start);
      while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return days;
    };

    // Fetch student info once (from Student model or existing Attendance records)
    let studentInfo = null;
    const student = await Student.findOne({ userId }).lean(); // Adjust if your model differs
    if (student) {
      studentInfo = {
        name: student.name,
        role: student.role,
        userId: student.userId,
      };
    }

    // WEEKLY REPORT - Show last 7 days (ending on provided date or today), including all days (Sundays included, mark absent if no punch)
    if (type === "weekly") {
      const endDate = parseDate(date) || new Date(); // Use provided date or default to today
      if (!endDate) return res.status(400).json({ message: "Invalid date provided" });

      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6); // 7-day range (inclusive)

      const startYMD = toYMD(startDate);
      const endYMD = toYMD(endDate);

      console.log(`Weekly range: ${startYMD} to ${endYMD}`); // DEBUG

      // Fetch only records within the date range from DB
      const existingRecords = await Attendance.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      console.log(`Fetched existing weekly records: ${existingRecords.length}`); // DEBUG

      // If no student info from Student model, try from existing records
      if (!studentInfo && existingRecords.length > 0) {
        studentInfo = {
          name: existingRecords[0].name,
          role: existingRecords[0].role,
          userId: existingRecords[0].userId,
        };
      }

      // Generate all days in the range (include all days, including Sundays)
      const allDays = generateDaysInRange(startDate, endDate);

      // Create a map of existing records by date (YMD format)
      const recordMap = new Map();
      existingRecords.forEach(record => {
        const ymd = toYMD(new Date(record.date));
        recordMap.set(ymd, record);
      });

      // Build final records: include existing or add "absent" for missing days
      const finalRecords = allDays.map(day => {
        const ymd = toYMD(day);
        if (recordMap.has(ymd)) {
          return recordMap.get(ymd);
        } else {
          // Add absent record (set punchIn to "Absent" so PDF shows it clearly)
          return {
            date: day,
            punchIn: "Absent",
            punchOut: null,
            status: "absent",
            name: studentInfo?.name || "Unknown",
            role: studentInfo?.role || "Unknown",
            userId: userId,
          };
        }
      });

      // Insert absent records into the database (only for missing days)
      const absentRecordsToInsert = finalRecords.filter(record => record.punchIn === "Absent");
      if (absentRecordsToInsert.length > 0) {
        try {
          await Attendance.insertMany(absentRecordsToInsert, { ordered: false }); // ordered: false to skip duplicates
          console.log(`Inserted ${absentRecordsToInsert.length} absent records into DB for weekly report.`);
        } catch (insertErr) {
          console.warn("Some absent records may already exist or insertion failed:", insertErr.message);
        }
      }

      // Sort by date in ascending order (earliest first)
      finalRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (!studentInfo) {
        return res.status(404).json({ message: "No User info found for this user." });
      }

      return res.json({
        records: finalRecords,
        student: studentInfo,
        range: { start: startYMD, end: endYMD },
      });
    }

    // MONTHLY REPORT - Now include all days, including Sundays, and mark absences for any missing day
    if (type === "monthly") {
      if (!month) return res.status(400).json({ message: "Month parameter is required for monthly reports" });

      const [year, monthNum] = month.split("-").map(Number);
      if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: "Invalid month format (expected YYYY-MM)" });
      }

      const startDate = new Date(year, monthNum - 1, 1); // First day of month
      const endDate = new Date(year, monthNum, 0); // Last day of month

      const startYMD = toYMD(startDate);
      const endYMD = toYMD(endDate);

      console.log(`Monthly range for ${month}: ${startYMD} to ${endYMD}`); // DEBUG

      // Fetch only records within the date range from DB
      const existingRecords = await Attendance.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      console.log(`Fetched existing monthly records: ${existingRecords.length}`); // DEBUG

      // If no User info from User model, try from existing records
      if (!studentInfo && existingRecords.length > 0) {
        studentInfo = {
          name: existingRecords[0].name,
          role: existingRecords[0].role,
          userId: existingRecords[0].userId,
        };
      }

      // Generate all days in the range (include all days, including Sundays)
      const allDays = generateDaysInRange(startDate, endDate);

      // Create a map of existing records by date (YMD format)
      const recordMap = new Map();
      existingRecords.forEach(record => {
        const ymd = toYMD(new Date(record.date));
        recordMap.set(ymd, record);
      });

      // Build final records: include existing or add "absent" for missing days
      const finalRecords = allDays.map(day => {
        const ymd = toYMD(day);
        if (recordMap.has(ymd)) {
          return recordMap.get(ymd);
        } else {
          // Add absent record (set punchIn to "Absent" so PDF shows it clearly)
          return {
            date: day,
            punchIn: "Absent",
            punchOut: null,
            status: "absent",
            name: studentInfo?.name || "Unknown",
            role: studentInfo?.role || "Unknown",
            userId: userId,
          };
        }
      });

      // Insert absent records into the database (only for missing days)
      const absentRecordsToInsert = finalRecords.filter(record => record.punchIn === "Absent");
      if (absentRecordsToInsert.length > 0) {
        try {
          await Attendance.insertMany(absentRecordsToInsert, { ordered: false }); // ordered: false to skip duplicates
          console.log(`Inserted ${absentRecordsToInsert.length} absent records into DB for monthly report.`);
        } catch (insertErr) {
          console.warn("Some absent records may already exist or insertion failed:", insertErr.message);
        }
      }

      // Sort by date in ascending order (earliest first)
      finalRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (!studentInfo) {
        return res.status(404).json({ message: "No User info found for this user." });
      }

      return res.json({
        records: finalRecords,
        student: studentInfo,
        range: { start: startYMD, end: endYMD },
      });
    }

    return res.status(400).json({ message: "Invalid request" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
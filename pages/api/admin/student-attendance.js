import connectDB from "../../../lib/mongodb";
import Attendance from "../../../models/Attendance";

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
    const { userId, type, month } = req.query;
    console.log(`Query params: userId=${userId}, type=${type}, month=${month}`); // DEBUG

    const toYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    // FIXED DATE FILTER
    const filter = (records, s, e) =>
      records.filter((r) => {
        const ymd = toYMD(new Date(r.date)); 
        console.log(`Checking record: date=${r.date} -> ${ymd}, in range ${s} to ${e}? ${ymd >= s && ymd <= e}`); // DEBUG
        return ymd >= s && ymd <= e;
      });

    const all = await Attendance.find({ userId }).lean();
    console.log(`Fetched ${all.length} records for userId: ${userId}`, all.map(r => ({ date: r.date, punchIn: r.punchIn }))); // DEBUG

    if (!all.length)
      return res
        .status(404)
        .json({ message: "No attendance records for this user." });

    // WEEKLY REPORT
    if (type === "weekly") {
      const today = new Date();
      const endYMD = toYMD(today);
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      const startYMD = toYMD(start);

      console.log(`Weekly range: ${startYMD} to ${endYMD}`); // DEBUG
      const filteredRecords = filter(all, startYMD, endYMD);
      console.log(`Filtered weekly records: ${filteredRecords.length}`); // DEBUG

      return res.json({
        records: filteredRecords,
        student: {
          name: all[0].name,
          role: all[0].role,
          userId: all[0].userId,
        },
        range: { start: startYMD, end: endYMD },
      });
    }

    // MONTHLY REPORT
    if (type === "monthly") {
      const [year, monthNum] = month.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 0);

      const startYMD = toYMD(start);
      const endYMD = toYMD(end);

      console.log(`Monthly range for ${month}: ${startYMD} to ${endYMD}`); // DEBUG
      const filteredRecords = filter(all, startYMD, endYMD);
      console.log(`Filtered monthly records: ${filteredRecords.length}`); // DEBUG

      return res.json({
        records: filteredRecords,
        student: {
          name: all[0].name,
          role: all[0].role,
          userId: all[0].userId,
        },
        range: { start: startYMD, end: endYMD },
      });
    }

    return res.status(400).json({ message: "Invalid request" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

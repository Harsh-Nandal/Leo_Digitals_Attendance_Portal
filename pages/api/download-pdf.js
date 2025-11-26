import connectDB from "../../lib/mongodb";
import Attendance from "../../models/Attendance";
import { downloadPDF } from "../../utils/pdfUtils"; // ✅ Correct import

export default async function handler(req, res) {
  try {
    await connectDB();

    const { userId, reportType, month, weekStart, weekEnd } = req.body;
    console.log("📥 Incoming body:", req.body);

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId" });
    }

    let query = { userId };
    let startDate, endDate;

    if (reportType === "monthly") {
      if (!month) {
        return res.status(400).json({ success: false, message: "Month is required for monthly report" });
      }

      const [year, monthNum] = month.split("-").map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (reportType === "weekly") {
      if (!weekStart || !weekEnd) {
        return res.status(400).json({ success: false, message: "Week start and end dates are required" });
      }

      startDate = new Date(weekStart);
      endDate = new Date(weekEnd);
      query.date = { $gte: startDate, $lte: endDate };
    }

    console.log("🔍 Attendance Query:", query);

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: 1 })
      .lean();

    console.log("✅ Found", attendanceRecords.length, "attendance records.");

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records available for this time period.",
      });
    }

    // ✅ Generate PDF using the correct function
    const pdfBuffer = await downloadPDF("Attendance", attendanceRecords, { 
        name: Attendance.name || "Student", 
        role: "student" 
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=attendance_${reportType}_${userId}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ success: false, message: "Error generating PDF" });
  }
}

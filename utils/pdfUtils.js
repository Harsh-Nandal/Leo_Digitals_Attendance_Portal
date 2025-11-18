import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

/**
 * Generates Attendance PDF for a student filtered by month or week
 */
export async function generatePDF(attendanceRecords = [], userId, student = {}, filterType = "monthly", month = null) {
  return new Promise((resolve, reject) => {
    try {
      if (!attendanceRecords.length) {
        throw new Error("No attendance records found for this period.");
      }

      // 🔹 Filter attendance based on month or week
      let filteredRecords = attendanceRecords;

      if (filterType === "monthly" && month) {
        const monthIndex = new Date(`${month} 1, 2025`).getMonth();
        filteredRecords = attendanceRecords.filter((rec) => {
          const recDate = new Date(rec.date);
          return recDate.getMonth() === monthIndex;
        });
      } else if (filterType === "weekly") {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        filteredRecords = attendanceRecords.filter((rec) => {
          const recDate = new Date(rec.date);
          return recDate >= weekStart && recDate <= weekEnd;
        });
      }

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const marginLeft = 50;
      const marginRight = 50;
      const centerX = pageWidth / 2;

      /** === HEADER === */
      const drawHeader = () => {
        const logoPath = path.join(process.cwd(), "public", "DesinerzAcademyDark.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, centerX - 70, 30, { width: 140 });
        }

        doc.moveDown(5);
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#cc0000").text("MAHARISHI DAYANAND DIGITAL COMPUTER INSTITUTE", { align: "center" });

        doc.moveDown(0.3);
        doc.font("Helvetica").fontSize(10).fillColor("#212529").text(
          "Under the Management of Maharishi Dayanand College regd. by Govt of Haryana",
          { align: "center" }
        );

        const bannerY = doc.y + 10;
        doc.rect(0, bannerY, pageWidth, 20).fill("#003399");
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text("ISO CERTIFIED 9001-2015 CERTIFIED", centerX, bannerY + 6, { align: "center" });
        doc.fillColor("#000000");

        doc.moveDown(2);
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#000000").text(`ATTENDANCE REPORT (${filterType === "weekly" ? "Weekly" : month ? month.toUpperCase() : "All"}) - 2025`, {
          align: "center",
        });

        const name = student?.name || "—";
        const role = student?.role || "—";
        const generated = new Date().toLocaleString();

        const infoY = doc.y + 10;
        doc.font("Helvetica").fontSize(11).fillColor("#000000");
        doc.text(`Name: ${name}`, marginLeft, infoY);
        doc.text(`Role: ${role}`, pageWidth - marginRight - 120, infoY);
        doc.text(`Generated: ${generated}`, marginLeft, infoY + 15);

        doc.moveDown(0.5);
        doc.strokeColor("#cccccc").moveTo(marginLeft, doc.y + 5).lineTo(pageWidth - marginRight, doc.y + 5).stroke();
      };

      /** === FOOTER === */
      const drawFooter = () => {
        const footerY = doc.page.height - 50;
        doc.strokeColor("#e5e7eb").moveTo(marginLeft, footerY - 10).lineTo(pageWidth - marginRight, footerY - 10).stroke();
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#6b7280")
          .text("Powered by Desinerz Academy", marginLeft, footerY)
          .text(`Page ${doc.page.number}`, pageWidth - marginRight, footerY, { align: "right" });
      };

      /** === TABLE HEADER === */
      const drawTableHeader = (startY) => {
        const colX = [70, 240, 410];
        const rowHeight = 22;
        doc.rect(colX[0] - 20, startY - 6, pageWidth - 100, rowHeight).fill("#003399");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11);
        doc.text("Date", colX[0], startY);
        doc.text("Punch In", colX[1], startY);
        doc.text("Punch Out", colX[2], startY);
        doc.fillColor("#000000");
        return startY + rowHeight;
      };

      /** === MAIN CONTENT === */
      drawHeader();
      let y = drawTableHeader(doc.y + 25);
      const rowHeight = 22;
      const colX = [70, 240, 410];
      const pageHeight = doc.page.height;
      const bottomMargin = 70;

      filteredRecords.forEach((rec, i) => {
        if (y + rowHeight > pageHeight - bottomMargin) {
          drawFooter();
          doc.addPage();
          drawHeader();
          y = drawTableHeader(doc.y + 25);
        }

        if (i % 2 === 0) {
          doc.rect(50, y - 6, pageWidth - 100, rowHeight).fill("#f5f7ff");
        }

        doc.fillColor("#000000").font("Helvetica").fontSize(10);
        doc.text(rec.date || "—", colX[0], y);
        doc.text(rec.punchIn || "—", colX[1], y);
        doc.text(rec.punchOut || "—", colX[2], y);
        y += rowHeight;
        doc.fillColor("#000000");
      });

      drawFooter();
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

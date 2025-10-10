// client-side helper for printing and pdf generation
// Install: npm i jspdf jspdf-autotable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** sanitize filename */
const sanitizeFilename = (name = "Attendance") =>
  name.replace(/[\/\\?%*:|"<>]/g, "_");

/** build a styled header like the marksheet */
function drawPdfHeader(doc, pageWidth, margin, title, student) {
  const name = student?.name || "";
  const role = student?.role || "";

  // Logo
  const logoPath = "/DesinerzAcademyDark.png"; // must be in /public

  doc.addImage(logoPath, "PNG", pageWidth / 2 - 30, 20, 60, 60);

  // Institute Title
  doc.setFont("helvetica", "bold");
  doc.setTextColor(204, 0, 0);
  doc.setFontSize(16);
  doc.text("MAHARISHI DAYANAND DIGITAL COMPUTER INSTITUTE", pageWidth / 2, 100, {
    align: "center",
  });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setTextColor(33, 37, 41);
  doc.setFontSize(10);
  doc.text(
    "Under the Management of Maharishi Dayanand College regd. by Govt of Haryana",
    pageWidth / 2,
    115,
    { align: "center" }
  );

  // ISO Banner
  doc.setFillColor(0, 51, 153);
  doc.rect(0, 125, pageWidth, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("ISO CERTIFIED 9001-2015 CERTIFIED", pageWidth / 2, 138, {
    align: "center",
  });

  // Report title
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${title} REPORT - 2025`, pageWidth / 2, 165, { align: "center" });

  // Student name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Name: ${name}`, margin.left, 185);
  if (role) doc.text(`Role: ${role}`, pageWidth - margin.right - 100, 185);

  // Line
  doc.setDrawColor(200);
  doc.line(margin.left, 192, pageWidth - margin.right, 192);
}

/** build footer like marksheet */
function drawPdfFooter(doc, pageWidth, margin, pageNumber) {
  const pageCount = doc.internal.getNumberOfPages();
  const footerY = doc.internal.pageSize.getHeight() - 35;

  doc.setDrawColor(240);
  doc.setLineWidth(0.4);
  doc.line(margin.left, footerY - 8, pageWidth - margin.right, footerY - 8);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Powered by Desinerz Academy", margin.left, footerY);
  doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin.right, footerY, {
    align: "right",
  });
}

/** download PDF of records styled like marksheet */
export function downloadPDF(tableTitle = "Attendance", tableRecords = [], student = {}) {
  if (!tableRecords || tableRecords.length === 0) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = { top: 200, left: 40, right: 40, bottom: 60 };

  const head = [["Date", "Punch In", "Punch Out"]];
  const body = tableRecords.map((r) => [r.date, r.punchIn ?? "—", r.punchOut ?? "—"]);

  autoTable(doc, {
    head,
    body,
    startY: margin.top,
    margin: { left: margin.left, right: margin.right, bottom: margin.bottom },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [0, 51, 153],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    tableLineColor: [230, 230, 230],
    tableLineWidth: 0.3,
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 160 },
      2: { cellWidth: 160 },
    },
    didDrawPage: function () {
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      drawPdfHeader(doc, pageWidth, margin, tableTitle, student);
      drawPdfFooter(doc, pageWidth, margin, pageNumber);
    },
  });

  const safe = sanitizeFilename(tableTitle || "Attendance");
  doc.save(`${safe}.pdf`);
}

/** escape HTML */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** build styled print HTML like the marksheet */
function buildPrintHtml(title, rowsHtml, student) {
  const now = new Date();
  const generatedAt = now.toLocaleString();
  const name = student?.name || "";
  const role = student?.role || "";
  const logoUrl = "/DesinerzAcademyDark.png";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
@page { margin: 36pt; }
html, body { font-family: "Poppins", Arial, sans-serif; background:#fff; color:#111827; margin:0; padding:0; }
.print-wrapper { padding:20pt; max-width:850px; margin:auto; border:1px solid #e5e7eb; }
.header { text-align:center; }
.logo { width:90px; height:auto; margin-bottom:10px; }
.institute { font-size:18px; font-weight:700; color:#cc0000; }
.sub-title { font-size:12px; color:#1e293b; margin-top:2px; }
.iso-banner { background:#003399; color:#fff; font-size:11px; font-weight:600; padding:4px 0; margin-top:6px; border-radius:2px; }
.report-title { font-size:14px; font-weight:700; margin-top:12px; color:#000; }
.meta-line { font-size:12px; margin-top:8px; display:flex; justify-content:space-between; }
table.att-table { width:100%; border-collapse:collapse; font-size:12px; margin-top:16px; }
table.att-table th { background:#003399; color:white; padding:8px; border:1px solid #ccc; }
table.att-table td { padding:8px; border:1px solid #ccc; text-align:center; }
table.att-table tr:nth-child(even) { background:#f9fafb; }
.footer { margin-top:20px; text-align:right; font-size:11px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:6px; }
@media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="print-wrapper">
  <div class="header">
    <img src="${logoUrl}" class="logo" alt="Logo"  style="width:15rem;"/>
    <div class="institute">MAHARISHI DAYANAND DIGITAL COMPUTER INSTITUTE</div>
    <div class="sub-title">Under the Management of Maharishi Dayanand College regd. by Govt of Haryana</div>
    <div class="iso-banner">ISO CERTIFIED 9001-2015 CERTIFIED</div>
    <div class="report-title">${escapeHtml(title)} REPORT - 2025</div>
  </div>

  <div class="meta-line">
    <div><strong>Name:</strong> ${escapeHtml(name)}</div>
    <div><strong>Role:</strong> ${escapeHtml(role)}</div>
    <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
  </div>

  <table class="att-table">
    <thead>
      <tr><th>Date</th><th>Punch In</th><th>Punch Out</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer">Powered by Desinerz Academy</div>
</div>
<script>
window.onload = function() { setTimeout(()=>window.print(), 300); };
</script>
</body>
</html>`;
}

/** print attendance styled like marksheet */
export function printTableHtml(tableTitle = "Attendance", tableRecords = [], student = {}) {
  if (!tableRecords || tableRecords.length === 0) return;

  const rowsHtml = tableRecords
    .map(
      (r) =>
        `<tr>
          <td>${escapeHtml(r.date ?? "")}</td>
          <td>${escapeHtml(r.punchIn ?? "—")}</td>
          <td>${escapeHtml(r.punchOut ?? "—")}</td>
        </tr>`
    )
    .join("");

  const html = buildPrintHtml(tableTitle, rowsHtml, student);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

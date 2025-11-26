// Install: npm i jspdf jspdf-autotable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** Convert image from /public to Base64 with error handling */
async function loadImageAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image as Base64"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null; // Return null to skip adding the image
  }
}

/** sanitize filename */
const sanitizeFilename = (name = "Attendance") =>
  name.replace(/[\/\\?%*:|"<>]/g, "_");

// ---------------------------------------------------------
//  HEADER (Sync version – required for jsPDF AutoTable)
// ---------------------------------------------------------
function drawHeaderSync(doc, pageWidth, margin, title, student, logo) {
  const name = student?.name || "";
  const role = student?.role || "";

  // LOGO (240px center) - Only add if logo is valid
  if (logo) {
    try {
      doc.addImage(logo, (pageWidth - 240) / 2, 20, 240, 120);
    } catch (error) {
      console.warn("Failed to add logo to PDF:", error);
      // Skip logo if it fails
    }
  }

  // MAIN TITLE
  doc.setFont("helvetica", "bold");
  doc.setTextColor(204, 0, 0);
  doc.setFontSize(20);
  doc.text(
    "MAHARISHI DAYANAND DIGITAL COMPUTER INSTITUTE",
    pageWidth / 2,
    160,
    { align: "center" }
  );

  // SUBTITLE
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(
    "Under the Management of Maharishi Dayanand College regd. by Govt of Haryana",
    pageWidth / 2,
    180,
    { align: "center" }
  );

  // ISO BANNER
  doc.setFillColor(0, 51, 153);
  doc.rect(0, 195, pageWidth, 25, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#fff");
  doc.text("ISO CERTIFIED 9001-2015 CERTIFIED", pageWidth / 2, 212, {
    align: "center",
  });

  // REPORT TITLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#000");
  doc.text(`${title} REPORT - 2025`, pageWidth / 2, 245, {
    align: "center",
  });

  // STUDENT DETAILS
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${name}`, margin.left, 270);
  if (role) {
    doc.text(`Role: ${role}`, pageWidth - margin.right - 120, 270);
  }

  // LINE
  doc.setDrawColor(200);
  doc.line(margin.left, 280, pageWidth - margin.right, 280);
}

// ---------------------------------------------------------
//  FOOTER
// ---------------------------------------------------------
function drawPdfFooter(doc, pageWidth, margin, pageNumber) {
  const pageCount = doc.internal.getNumberOfPages();
  const footerY = doc.internal.pageSize.getHeight() - 40;

  doc.setDrawColor(220);
  doc.line(margin.left, footerY - 8, pageWidth - margin.right, footerY - 8);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Powered by Desinerz Academy", margin.left, footerY);
  doc.text(
    `Page ${pageNumber} of ${pageCount}`,
    pageWidth - margin.right,
    footerY,
    { align: "right" }
  );
}

// ---------------------------------------------------------
//  FINAL PDF DOWNLOAD (MATCHES PRINT EXACTLY)
// ---------------------------------------------------------
export async function downloadPDF(
  tableTitle = "Attendance",
  tableRecords = [],
  student = {}
) {
  // Validate input data
  if (!Array.isArray(tableRecords) || tableRecords.length === 0) {
    console.error("No valid records provided for PDF generation.");
    alert("No data available to generate PDF.");
    return;
  }

  // Sanitize records to ensure strings
  const sanitizedRecords = tableRecords.map((r) => ({
    date: String(r.date || ""),
    punchIn: String(r.punchIn || "—"),
    punchOut: String(r.punchOut || "—"),
  }));

  console.log("Generating PDF with records:", sanitizedRecords); // Debug log

  // PAGE SIZE: width 850px (same as print)
  const doc = new jsPDF({
    unit: "pt",
    format: [850, 842],
  });

  const pageWidth = 850;
  const margin = { top: 300, left: 40, right: 40, bottom: 60 };

  // LOAD LOGO (before drawing)
  const logo = await loadImageAsBase64("/DesinerzAcademyDark.png");

  // DRAW HEADER FIRST
  drawHeaderSync(doc, pageWidth, margin, tableTitle, student, logo);

  const head = [["Date", "Punch In", "Punch Out"]];
  const body = sanitizedRecords.map((r) => [r.date, r.punchIn, r.punchOut]);

  try {
    autoTable(doc, {
      head,
      body,
      startY: margin.top, // table starts after header
      margin,
      styles: {
        font: "helvetica",
        fontSize: 12,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [0, 51, 153],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.5,

      // RUN ON EVERY PAGE
      didDrawPage: (data) => {
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

        // Redraw header for pages > 1
        if (pageNumber > 1) {
          drawHeaderSync(doc, pageWidth, margin, tableTitle, student, logo);
        }

        drawPdfFooter(doc, pageWidth, margin, pageNumber);
      },
    });

    const safe = sanitizeFilename(tableTitle);
    doc.save(`${safe}.pdf`);
    console.log("PDF generated and downloaded successfully."); // Debug log
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Check console for details.");
  }
}

// ---------------------------------------------------------
//  PRINT VERSION (unchanged)
// ---------------------------------------------------------
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintHtml(title, rowsHtml, student) {
  const now = new Date().toLocaleString();
  const name = student?.name ?? "";
  const role = student?.role ?? "";
  const logoUrl = "/DesinerzAcademyDark.png";

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />

<style>
@page { margin: 36pt; }
html, body { font-family: "Poppins", Arial; background:#fff; margin:0; padding:0; }
.print-wrapper { width:850px; margin:auto; padding:20px; }
.header { text-align:center; }
.logo { width:240px; margin-bottom:10px; }
.institute { font-size:20px; font-weight:700; color:#cc0000; }
.sub-title { font-size:12px; margin-top:4px; color:#333; }
.iso-banner { background:#003399; color:#fff; padding:6px 0; margin-top:8px; font-size:12px; font-weight:bold; }
.report-title { margin-top:12px; font-size:16px; font-weight:bold; }
.meta-line { margin-top:12px; display:flex; justify-content:space-between; font-size:13px; }
table { width:100%; border-collapse:collapse; margin-top:20px; font-size:13px; }
table th { background:#003399; color:#fff; padding:10px; border:1px solid #ddd; }
table td { padding:10px; border:1px solid #ccc; text-align:center; }
table tr:nth-child(even) { background:#f8f9ff; }
.footer { margin-top:20px; text-align:right; font-size:12px; color:#555; border-top:1px solid #ddd; padding-top:8px; }
@media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>

<body>
<div class="print-wrapper">

  <div class="header">
    <img src="${logoUrl}" class="logo" />
    <div class="institute">MAHARISHI DAYANAND DIGITAL COMPUTER INSTITUTE</div>
    <div class="sub-title">Under the Management of Maharishi Dayanand College regd. by Govt of Haryana</div>
    <div class="iso-banner">ISO CERTIFIED 9001-2015 CERTIFIED</div>
    <div class="report-title">${escapeHtml(title)} REPORT - 2025</div>
  </div>

  <div class="meta-line">
    <div><strong>Name:</strong> ${escapeHtml(name)}</div>
    <div><strong>Role:</strong> ${escapeHtml(role)}</div>
    <div><strong>Generated:</strong> ${escapeHtml(now)}</div>
  </div>

  <table>
    <thead>
      <tr><th>Date</th><th>Punch In</th><th>Punch Out</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer">Powered by Desinerz Academy</div>

</div>

<script>
window.onload = () => setTimeout(() => window.print(), 300);
</script>

</body>
</html>
`;
}

export function printTableHtml(title, records = [], student = {}) {
  if (!records.length) return;

  const rowsHtml = records
    .map(
      (r) => `
<tr>
  <td>${escapeHtml(r.date ?? "")}</td>
  <td>${escapeHtml(r.punchIn ?? "—")}</td>
  <td>${escapeHtml(r.punchOut ?? "—")}</td>
</tr>`
    )
    .join("");

  const html = buildPrintHtml(title, rowsHtml, student);
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.open();
  win.document.write(html);
  win.document.close();
}

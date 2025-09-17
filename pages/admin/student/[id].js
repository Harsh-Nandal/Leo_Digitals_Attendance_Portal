"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// at top of the file
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AdminSidebar from "../../../components/AdminSidebar"; // ✅ Import Sidebar
import AdminHeader from "../../../components/AdminHeader"; // ✅ Import Sidebar

export default function StudentPage() {
  const router = useRouter();
  const { id } = router.query;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [dayRecords, setDayRecords] = useState([]);
  const [tableRecords, setTableRecords] = useState([]);
  const [tableTitle, setTableTitle] = useState("");
  const [showNoDataModal, setShowNoDataModal] = useState(false);

  const openNoDataModal = () => setShowNoDataModal(true);
  const closeNoDataModal = () => setShowNoDataModal(false);

  // Fetch student data
  useEffect(() => {
    if (!id || !selectedMonth) return;

    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/student/${id}?month=${selectedMonth}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, selectedMonth, router]);

  // Fetch punch-in/out for specific date
  useEffect(() => {
    if (!id || !selectedDate) return;

    const token = localStorage.getItem("adminToken");
    const fetchDayData = async () => {
      try {
        const res = await fetch(
          `/api/admin/student/${id}?date=${selectedDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (!data.dayRecords || data.dayRecords.length === 0) {
          openNoDataModal();
        }
        setDayRecords(data.dayRecords || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchDayData();
  }, [selectedDate, id]);

  const fetchPrevAndCurrentWeek = async () => {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(`/api/admin/student/${id}?prevWeek=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      openNoDataModal();
      return;
    }

    setTableTitle(
      `Attendance for ${data.prevWeekRange.start} to ${data.currentWeekRange.end}`
    );
    setTableRecords(data.records || []);
  };

  const fetchSelectedMonth = async () => {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(
      `/api/admin/student/${id}?month=${selectedMonth}&allDays=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (!data.records || data.records.length === 0) {
      openNoDataModal();
    }
    setTableTitle(`Attendance for ${selectedMonth}`);
    setTableRecords(data.records || []);
  };

  // ---------- Helper: sanitize filename ----------
  const sanitizeFilename = (name = "Attendance") =>
    name.replace(/[\/\\?%*:|"<>]/g, "_");

  // ---------- Improved PDF generator ----------
  const downloadPDF = () => {
    if (!tableRecords || tableRecords.length === 0) return;

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = { top: 80, left: 40, right: 40, bottom: 60 };

    // header/footer rendering for each page
    const header = (data) => {
      const title = tableTitle || "Attendance";
      const name = student?.name || "";
      const role = student?.role || "";

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.setFont("helvetica", "bold");
      doc.text(name, margin.left, 30);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(role, margin.left, 46);

      // title centered
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const centerX = pageWidth / 2;
      doc.text(title, centerX, 40, { align: "center" });

      // small line under header
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin.left, 54, pageWidth - margin.right, 54);
    };

    const footer = (data) => {
      const page = doc.internal.getNumberOfPages();
      const str = `Page ${data.pageNumber} of ${page}`;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(str, pageWidth - margin.right, doc.internal.pageSize.getHeight() - 20, {
        align: "right",
      });

      // Draw a subtle top border for footer
      doc.setDrawColor(230);
      doc.setLineWidth(0.5);
      doc.line(margin.left, doc.internal.pageSize.getHeight() - 40, pageWidth - margin.right, doc.internal.pageSize.getHeight() - 40);
    };

    // columns and body
    const head = [["Date", "Punch In", "Punch Out"]];
    const body = tableRecords.map((r) => [
      r.date,
      r.punchIn ?? "—",
      r.punchOut ?? "—",
    ]);

    // Use autoTable with didDrawPage to attach header/footer
    autoTable(doc, {
      head: head,
      body: body,
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
        fillColor: [240, 240, 240],
        textColor: 20,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      tableWidth: "auto",
      didDrawPage: function (data) {
        header(data);
        footer(data);
      },
      willDrawCell: function (data) {
        // add subtle border color tweak if desired
      },
      // for long text, wrap
      columnStyles: {
        0: { cellWidth: 120 }, // Date
        1: { cellWidth: 170 }, // Punch In
        2: { cellWidth: 170 }, // Punch Out
      },
    });

    // Save
    const safe = sanitizeFilename(tableTitle || "Attendance");
    doc.save(`${safe}.pdf`);
  };

  // ---------- Improved Print Table ----------
  const printTable = () => {
    if (!tableRecords || tableRecords.length === 0) return;

    // build HTML for print
    const sanitizedTitle = tableTitle || "Attendance";
    const now = new Date();
    const generatedAt = now.toLocaleString();

    const name = student?.name || "";
    const role = student?.role || "";

    const rowsHtml = tableRecords
      .map(
        (r, idx) => `<tr>
          <td class="td">${r.date}</td>
          <td class="td">${r.punchIn ?? "—"}</td>
          <td class="td">${r.punchOut ?? "—"}</td>
        </tr>`
      )
      .join("");

    const style = `
      <style>
        /* Page */
        @page { margin: 40pt; }
        html, body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #111827;
          margin: 0;
          padding: 0;
        }

        .print-wrapper {
          padding: 10pt 12pt;
        }

        .header {
          display: block;
          margin-bottom: 8pt;
          padding-bottom: 6pt;
          border-bottom: 1px solid #e5e7eb;
        }
        .brand {
          font-size: 16pt;
          font-weight: 700;
        }
        .meta {
          font-size: 10pt;
          color: #6b7280;
          margin-top: 4px;
        }

        .title {
          text-align: center;
          font-size: 12pt;
          font-weight: 700;
          margin: 10px 0 8px 0;
        }

        table.att-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10.5pt;
        }

        table.att-table thead {
          background: #f3f4f6;
        }

        table.att-table thead th {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        table.att-table tbody td {
          padding: 8px 10px;
          border-bottom: 1px solid #f3f4f6;
        }

        table.att-table tr:nth-child(even) {
          background: #fbfbfb;
        }

        /* Make the thead repeat on each printed page */
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }

        /* Footer area (will repeat) */
        .print-footer {
          width: 100%;
          display: block;
          margin-top: 8pt;
          padding-top: 6pt;
          border-top: 1px solid #e5e7eb;
          font-size: 9pt;
          color: #6b7280;
          text-align: right;
        }

        /* Hide non-essential elements when printing (if any) */
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    `;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${sanitizedTitle}</title>
          ${style}
        </head>
        <body>
          <div class="print-wrapper">
            <div class="header">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div class="brand">${name}</div>
                  <div class="meta">${role}</div>
                </div>
                <div style="text-align:right">
                  <div class="meta">Generated: ${generatedAt}</div>
                  <div class="meta">${sanitizedTitle}</div>
                </div>
              </div>
            </div>

            <div class="title">${sanitizedTitle}</div>

            <table class="att-table" role="table" aria-label="Attendance table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="print-footer">
              <span>Powered by Desinerz Academy</span>
            </div>
          </div>

          <script>
            // Give the browser a moment to lay out the page, then print and close
            window.onload = function () {
              setTimeout(function () {
                window.print();
                // Some browsers block window.close(); in user-initiated contexts, but try it
                setTimeout(function () { window.close(); }, 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert("Please allow popups for this site to print.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading)
    return (
      <p className="text-center p-6 text-gray-600">Loading student data...</p>
    );
  if (error)
    return <p className="text-center p-6 text-red-500">Error: {error}</p>;
  if (!student) return <p className="text-center p-6">No student found.</p>;

  const SummaryCard = ({ title, data }) => (
    <div className="bg-white shadow-lg rounded-xl p-6 border hover:shadow-xl transition-all">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">
        From {data.start} to {data.end}
      </p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-3xl font-bold text-green-700">{data.present}</p>
          <p className="text-sm text-gray-500">Present</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-3xl font-bold text-red-700">{data.absent}</p>
          <p className="text-sm text-gray-500">Absent</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-3xl font-bold text-blue-700">{data.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      {/* ✅ Sidebar */}
      <AdminSidebar />

      {/* ✅ Main Content Wrapper */}
      <div className="ml-64 flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-x-hidden">
        {/* ✅ Fixed Header */}
        <AdminHeader showAbsent={"Student Report"} />

        {/* ✅ Page Content (pushed below header with mt-16) */}
        <main className="mt-16 p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen text-gray-900">
          {/* Student Info */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-800">{student.name}</h2>
            <p className="text-lg text-gray-500">Role: {student.role}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryCard title="Weekly Attendance" data={student.weekly} />
            <SummaryCard title="Monthly Attendance" data={student.monthly} />
          </div>
          <br />

          {/* Date Selector */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-gray-700 font-medium">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg p-2 shadow-sm"
              min={`${selectedMonth}-01`}
              max={`${selectedMonth}-31`}
            />
          </div>

          {/* Punch Records for a specific date */}
          {selectedDate && dayRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Punch Records for {selectedDate}
              </h3>
              <table className="w-full border mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 border">Punch In</th>
                    <th className="p-2 border">Punch Out</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRecords.map((r, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{r.punchIn || "—"}</td>
                      <td className="p-2 border">{r.punchOut || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={printTable}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all"
              >
                Print Records
              </button>
            </div>
          )}

          {/* Month Selector */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-gray-700 font-medium">Select Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-lg p-2 shadow-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-4">
            <button
              onClick={fetchPrevAndCurrentWeek}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg shadow transition-all"
            >
              Show Current + Previous Week
            </button>

            <button
              onClick={fetchSelectedMonth}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow transition-all"
            >
              Show Selected Month
            </button>
          </div>

          {/* Week/Month Attendance Table */}
          {tableRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">{tableTitle}</h3>
              <table className="w-full border mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Punch In</th>
                    <th className="p-2 border">Punch Out</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRecords.map((r, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{r.date}</td>
                      <td className="p-2 border">{r.punchIn || "—"}</td>
                      <td className="p-2 border">{r.punchOut || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-3">
                <button
                  onClick={printTable}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition-all"
                >
                  Print Table
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition-all"
                >
                  Download PDF
                </button>
              </div>
            </div>
          )}

          {/* No Data Modal */}
          {showNoDataModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  No Data Found
                </h2>
                <p className="text-gray-600 mb-5">
                  There are no records available for this selection.
                </p>
                <button
                  onClick={closeNoDataModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

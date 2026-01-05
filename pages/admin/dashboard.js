"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";
import { downloadPDF } from "../../utils/pdfUtils"; // This IS needed for client-side PDF generation
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * AdminDashboard — pixel-match UI to provided screenshot.
 *
 * Notes:
 * - Uses Tailwind utility classes for layout + a small amount of component-local CSS
 *   (within a <style jsx> block) for the tiny pixel adjustments (dot position, border thickness).
 * - Keeps all original logic for fetching and downloading PDFs from your code.
 * - This file is intended to fully replace your existing admin dashboard page.
 */

export default function AdminDashboard() {
  const [data, setData] = useState({
    absentDaily: [],
    daily: [],
    absenteesWeek: [],
    absenteesMonth: [],
  });

  const [filteredMonthData, setFilteredMonthData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("weekly");

  const router = useRouter();

  // AUTH CHECK
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.replace("/admin/login");
    else setAuthChecked(true);
  }, [router]);

  // default month sample (set to current month)
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    setSelectedMonth(currentMonth);
  }, []);

  // fetch data
  useEffect(() => {
    if (!authChecked) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("adminToken");

        const res = await fetch("/api/admin/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed to fetch data: ${res.statusText}`);

        const json = await res.json();

        setData({
          daily: json.daily ?? [],
          absentDaily: json.absentDaily ?? [],
          absenteesWeek: json.absenteesWeek ?? [],
          absenteesMonth: json.absenteesMonth ?? [],
        });

        setFilteredMonthData(json.absenteesMonth ?? []);
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked]);

  // month filter (FIXED: Added deduplication to remove duplicate entries in the table)
  const handleMonthFilter = (value) => {
    setSelectedMonth(value);

    if (!value) {
      // Deduplicate the full list as well
      const seen = new Set();
      const uniqueFull = (data.absenteesMonth || []).filter((item) => {
        const id = item.userId || item.regNo;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setFilteredMonthData(uniqueFull);
      return;
    }

    const [year, month] = value.split("-");
    const monthName = new Date(value + "-01")
      .toLocaleString("en-US", {
        month: "long",
      })
      .toLowerCase();
    const monthNumberFormat = `${year}-${month}`;

    const filtered = (data.absenteesMonth || []).filter((item) => {
      const m = (item.month || "").toString().toLowerCase();
      return (
        m.includes(monthName) ||
        m.includes(monthNumberFormat) ||
        m.includes(month) ||
        m.includes(year)
      );
    });

    // FIXED: Deduplicate the filtered results to remove any duplicate entries
    const seen = new Set();
    const uniqueFiltered = filtered.filter((item) => {
      const id = item.userId || item.regNo;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    setFilteredMonthData(uniqueFiltered);
  };

  // FIXED: handle PDF download (now correctly sends type, date for weekly, and month for monthly; removed unnecessary download=pdf param)
  const handleDownloadReport = async (student) => {
    try {
      const token = localStorage.getItem("adminToken");
      const type = activeTab; // "weekly" or "monthly"

      const userId = student.userId || student.regNo;
      if (!userId) {
        toast.error("Invalid student ID. Cannot generate report.", {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Build URL with correct params (no download=pdf, as it's not used by the API)
      let url = `/api/submit-attendance?userId=${userId}&type=${type}`;

      if (type === "monthly") {
        const month = selectedMonth || currentMonth;
        url += `&month=${month}`;
      } else if (type === "weekly") {
        url += `&date=${currentDate}`; // End date for the week
      }

      console.log("PDF Download URL:", url); // DEBUG: Log the URL to verify params

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${res.statusText}`);
      }

      // Parse JSON response (now filtered and sorted by the API, including absences)
      const { records, student: studentData } = await res.json();

      // Validate data
      if (!Array.isArray(records) || records.length === 0) {
        toast.error("No attendance records found for this student.", {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }

      console.log("Records for PDF:", records); // DEBUG: Log records to verify absences are included

      // Generate PDF client-side using the downloadPDF function (absences will be highlighted in red)
      await downloadPDF("Attendance", records, studentData || student);

      toast.success("PDF downloaded successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(`Failed to generate PDF: ${err.message}`, {
        position: "top-right",
        autoClose: 4000,
      });
    }
  };

  // loading state
  if (!authChecked || loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-purple-700 border-t-transparent" />
      </div>
    );

  // error
  if (error)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 text-red-700 p-6">
        <h2 className="text-2xl font-semibold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );

  const todayPresents = data.daily.slice(0, 4);
  const todayAbsents = data.absentDaily.slice(0, 4);
  const tableData =
    activeTab === "weekly" ? data.absenteesWeek : filteredMonthData;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar component (left) */}
      <div className="fixed left-0 top-0 h-full z-20">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="ml-64 flex-1 flex flex-col">
        <AdminHeader title="Dashboard" />

        <main className="p-8 mt-16 space-y-10">
          {/* --- TOP ROW: Today Absents --- */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-700">
                  Today Absents
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Showing {data.absentDaily.length} total absents
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/attendance/absent")}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View Detail
                </button>

                <div className="bg-white rounded-full border px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B21A8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="inline-block"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span className="text-xs font-medium text-gray-700">
                    Export
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {todayAbsents.length ? (
                todayAbsents.map((user, i) => (
                  <div
                    key={i}
                    className="relative bg-white border-2 border-red-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-1"
                    style={{ minHeight: "98px" }}
                  >
                    {/* small red dot top-right */}
                    <span className="status-dot status-dot-red" />

                    <p className="text-xs text-gray-400 mb-1">
                      REG NO - {user.userId || user.regNo}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-lg text-gray-800">
                        {user.name}
                      </p>
                      <div className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 font-medium">
                        Absent
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No absents today</div>
              )}
            </div>
          </section>
          {/* --- SECOND ROW: Today Presents --- */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-700">
                  Today Presents
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Showing {data.daily.length} total presents
                </p>
              </div>

              <div>
                <button
                  onClick={() => router.push("/admin/attendance/present")}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View Detail
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {todayPresents.length ? (
                todayPresents.map((user, i) => (
                  <div
                    key={i}
                    className="relative bg-white border-2 border-green-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-1"
                    style={{ minHeight: "110px" }}
                  >
                    <span className="status-dot status-dot-green" />

                    <p className="text-xs text-gray-400 mb-1">
                      REG NO - {user.userId || user.regNo}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-lg text-gray-800">
                        {user.name}
                      </p>
                      <div className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600 font-medium">
                        Present
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-600 leading-5">
                      <div className="flex justify-between">
                        <span>Punch IN</span>
                        <span className="font-medium">
                          {user.punchIn || "--"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Punch Out</span>
                        <span className="font-medium text-orange-500">
                          {user.punchOut || "PENDING"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No presents today</div>
              )}
            </div>
          </section>
          {/* --- ABSENTEES / TABLE SECTION (Card) --- */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Total Absentees
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Weekly / monthly absentee overview
                </p>
              </div>

              {/* TOP RIGHT quick link */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">View Detail</span>
                <div className="rounded-full bg-white border px-3 py-1 text-sm flex items-center gap-2 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="inline-block"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Tabs - Weekly / Monthly (styled like screenshot) */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === "weekly"
                    ? "bg-purple-700 text-white shadow-lg"
                    : "bg-white border border-gray-200 text-gray-700"
                }`}
              >
                Weekly Absentees
              </button>

              <button
                onClick={() => setActiveTab("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === "monthly"
                    ? "bg-purple-700 text-white shadow-lg"
                    : "bg-white border border-gray-200 text-gray-700"
                }`}
              >
                Monthly Absentees
              </button>

              {/* Month input (only when monthly active) */}
              {activeTab === "monthly" && (
                <div className="ml-4">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => handleMonthFilter(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600">
                      Registration No
                    </th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600">
                      Role
                    </th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600">
                      Total Absents
                    </th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600">
                      Detailed Report
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(() => {
                    // FIXED: Deduplicate tableData to remove duplicate entries before rendering
                    const uniqueTableData = (tableData || []).filter(
                      (item, index, self) =>
                        self.findIndex(
                          (i) =>
                            (i.userId || i.regNo) ===
                            (item.userId || item.regNo)
                        ) === index
                    );

                    return uniqueTableData.map((student, i) => (
                      <tr
                        key={student.userId || student.regNo || i}
                        className="border-b hover:bg-gray-50"
                      >
                        <td
                          className="p-3 text-indigo-600 cursor-pointer hover:underline"
                          onClick={() =>
                            router.push(
                              `/admin/students/${
                                student.userId || student.regNo
                              }`
                            )
                          }
                        >
                          {student.name || "—"}
                        </td>

                        <td className="p-3 text-sm text-gray-700">
                          {student.userId || student.regNo || "—"}
                        </td>

                        <td className="p-3 text-sm text-gray-700">
                          {student.role || "—"}
                        </td>

                        <td className="p-3 text-sm text-gray-700">
                          {student.absences ?? student.total ?? 0}
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => handleDownloadReport(student)}
                            className="flex items-center gap-2 text-indigo-600 hover:underline text-sm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#4338CA"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="inline-block"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}

                  {/* If no rows */}
                  {(!tableData || tableData.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Toast container */}
      <ToastContainer />

      {/* SMALL CUSTOM CSS to match screenshot micro-details */}
      <style jsx>{`
        /* status dot (top-right of cards) */
        .status-dot {
          position: absolute;
          top: 12px;
          right: 16px;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
        }
        .status-dot-red {
          background: #ef4444; /* red-500 */
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
        }
        .status-dot-green {
          background: #10b981; /* green-500 */
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08);
        }

        /* precise border radius to match screenshot */
        .rounded-2xl {
          border-radius: 14px;
        }

        /* shadow tuning */
        .shadow-sm {
          box-shadow: 0 1px 4px rgba(16, 24, 40, 0.04);
        }
        .shadow-md {
          box-shadow: 0 6px 18px rgba(16, 24, 40, 0.08);
        }

        /* table row height */
        table tbody tr td {
          vertical-align: middle;
        }

        /* small responsive tweaks to preserve desktop look */
        @media (min-width: 1280px) {
          main {
            padding-left: 48px;
            padding-right: 48px;
          }
        }
      `}</style>
    </div>
  );
}

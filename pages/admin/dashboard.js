"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";

export default function AdminDashboard() {
  const [data, setData] = useState({
    absentDaily: [],
    daily: [],
    absenteesWeek: [],
    absenteesMonth: [],
  });
  const [filteredMonthData, setFilteredMonthData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("weekly");

  const router = useRouter();

  /** ✅ Auth Check */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.replace("/admin/login");
    else setAuthChecked(true);
  }, [router]);

  /** ✅ Fetch Dashboard Data */
  useEffect(() => {
    if (!authChecked) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("adminToken");
        const res = await fetch("/api/admin/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData({
          daily: json.daily ?? [],
          absentDaily: json.absentDaily ?? [],
          absenteesWeek: json.absenteesWeek ?? [],
          absenteesMonth: json.absenteesMonth ?? [],
        });
        setFilteredMonthData(json.absenteesMonth ?? []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authChecked]);

  /** ✅ Month Filter */
  const handleMonthFilter = (monthValue) => {
    setSelectedMonth(monthValue);
    if (!monthValue) {
      setFilteredMonthData(data.absenteesMonth);
    } else {
      const filtered = (data.absenteesMonth || []).filter((student) =>
        student.month
          ? student.month.toLowerCase() === monthValue.toLowerCase()
          : false
      );
      setFilteredMonthData(filtered);
    }
  };

  /** ✅ PDF Download */
  const handleDownloadReport = async (student) => {
    try {
      if (!student?.userId && !student?.regNo) {
        alert("Invalid student record — missing ID!");
        return;
      }

      const reportType = activeTab;
      const userId = student.userId || student.regNo;
      const payload = { userId, reportType };

      if (reportType === "monthly" && selectedMonth) {
        payload.month = selectedMonth; // e.g. "2025-11"
      } else if (reportType === "weekly" && weekStart && weekEnd) {
        payload.weekStart = weekStart;
        payload.weekEnd = weekEnd;
      } else if (reportType === "weekly" && (!weekStart || !weekEnd)) {
        alert("Please select a valid week range before downloading report.");
        return;
      }

      const res = await fetch("/api/attendance/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn("PDF generation failed:", errText);
        alert("No attendance records available for this student.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${student.name || "attendance"}_${reportType}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to generate PDF — see console for details.");
    }
  };

  /** ✅ States: Loading + Error */
  if (!authChecked || loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-100 text-red-700 p-6">
        <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );

  /** ✅ Data Mappings */
  const todayAbsents = (data.absentDaily ?? []).slice(0, 4);
  const totalAbsentsCount = data.absentDaily?.length ?? 0;
  const todayPresents = (data.daily ?? []).slice(0, 4);
  const totalPresentsCount = data.daily?.length ?? 0;
  const tableData =
    activeTab === "weekly" ? data.absenteesWeek ?? [] : filteredMonthData ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 flex-1 flex flex-col">
        <AdminHeader title="Dashboard" />

        <main className="p-8 mt-16 space-y-10">
          {/* ✅ Today’s Absents */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Today Absents{" "}
                <span className="text-sm text-red-600">
                  ({totalAbsentsCount})
                </span>
              </h3>
              <button
                onClick={() => router.push("/admin/attendance/absent")}
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {todayAbsents.length > 0 ? (
                todayAbsents.map((user, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500">
                        REG NO: {user.userId || user.regNo || "—"}
                      </p>
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    </div>
                    <p className="font-semibold text-red-700 text-sm">
                      {user.name || "Unknown"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No absents today</p>
              )}
            </div>
          </section>

          {/* ✅ Today’s Presents */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Today Presents{" "}
                <span className="text-sm text-green-600">
                  ({totalPresentsCount})
                </span>
              </h3>
              <button
                onClick={() => router.push("/admin/attendance/present")}
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {todayPresents.length > 0 ? (
                todayPresents.map((user, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-gray-500">
                        REG NO: {user.userId || user.regNo || "—"}
                      </p>
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    </div>
                    <p className="font-semibold text-green-700 text-sm">
                      {user.name || "Unknown"}
                    </p>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>
                        Punch IN:{" "}
                        <span className="font-semibold">
                          {user.punchIn || "--"}
                        </span>
                      </p>
                      <p>
                        Punch OUT:{" "}
                        <span className="font-semibold text-yellow-600">
                          {user.punchOut || "PENDING"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No presents today</p>
              )}
            </div>
          </section>

          {/* ✅ Absentees Table */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-lg text-gray-800">
                Total Absentees List
              </h3>
            </div>

            {/* Tab + Filter */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`px-5 py-2 rounded-l-full border transition ${
                    activeTab === "weekly"
                      ? "bg-purple-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setActiveTab("monthly")}
                  className={`px-5 py-2 rounded-r-full border transition ${
                    activeTab === "monthly"
                      ? "bg-purple-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Monthly
                </button>
              </div>

              {activeTab === "monthly" ? (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="monthSelect"
                    className="text-sm font-medium text-gray-700"
                  >
                    Select Month:
                  </label>
                  <input
                    type="month"
                    id="monthSelect"
                    value={selectedMonth}
                    onChange={(e) => handleMonthFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Week Range:
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-gray-200 text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Registration No</th>
                    <th className="py-3 px-4 text-left">Role</th>
                    <th className="py-3 px-4 text-left">Total Absents</th>
                    <th className="py-3 px-4 text-left">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((student, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="py-2 px-4">{student.name}</td>
                      <td className="py-2 px-4">
                        {student.userId || student.regNo || "—"}
                      </td>
                      <td className="py-2 px-4">{student.role || "—"}</td>
                      <td className="py-2 px-4">{student.absences ?? 0}</td>
                      <td
                        onClick={() => handleDownloadReport(student)}
                        className="py-2 px-4 text-blue-600 font-medium cursor-pointer hover:underline"
                      >
                        ⬇️ Download
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

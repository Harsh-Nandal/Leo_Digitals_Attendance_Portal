"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import AdminSidebar from "../../../components/AdminSidebar";
import AdminHeader from "../../../components/AdminHeader";

import SummaryCard from "../../../components/admin/SummaryCard";
import DateSelector from "../../../components/admin/DateSelector";
import RecordsTable from "../../../components/admin/RecordsTable";
import ActionButtons from "../../../components/admin/ActionButtons";
import NoDataModal from "../../../components/admin/NoDataModal";

export default function StudentPage() {
  const router = useRouter();
  const { id } = router.query;

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedDate, setSelectedDate] = useState("");
  const [dayRecords, setDayRecords] = useState([]);
  const [tableRecords, setTableRecords] = useState([]);
  const [tableTitle, setTableTitle] = useState("");
  const [showNoDataModal, setShowNoDataModal] = useState(false);

  const openNoDataModal = () => setShowNoDataModal(true);
  const closeNoDataModal = () => setShowNoDataModal(false);

  // Fetch student / month summary
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
        const res = await fetch(`/api/admin/student/${id}?month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  // Fetch day records for selected date
  useEffect(() => {
    if (!id || !selectedDate) return;
    const token = localStorage.getItem("adminToken");
    const fetchDayData = async () => {
      try {
        const res = await fetch(`/api/admin/student/${id}?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const data = await res.json();
        if (!data.dayRecords || data.dayRecords.length === 0) {
          openNoDataModal();
        }
        setDayRecords(data.dayRecords || []);
      } catch (err) {
        console.error(err);
        openNoDataModal();
      }
    };
    fetchDayData();
  }, [selectedDate, id]);

  const fetchPrevAndCurrentWeek = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(`/api/admin/student/${id}?prevWeek=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      const data = await res.json();

      if (!data.records || data.records.length === 0) {
        openNoDataModal();
        return;
      }

      setTableTitle(`Attendance for ${data.prevWeekRange.start} to ${data.currentWeekRange.end}`);
      setTableRecords(data.records || []);
    } catch (err) {
      console.error(err);
      openNoDataModal();
    }
  };

  const fetchSelectedMonth = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(`/api/admin/student/${id}?month=${selectedMonth}&allDays=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      const data = await res.json();
      if (!data.records || data.records.length === 0) {
        openNoDataModal();
      }
      setTableTitle(`Attendance for ${selectedMonth}`);
      setTableRecords(data.records || []);
    } catch (err) {
      console.error(err);
      openNoDataModal();
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-400"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen bg-red-950 text-red-300">
        <p>Error: {error}</p>
      </div>
    );

  if (!student)
    return (
      <div className="flex justify-center items-center min-h-screen text-white bg-gray-900">
        <p>No student found.</p>
      </div>
    );

  return (
    <div className="flex min-h-screen text-white">
      <AdminSidebar />

      <div className="ml-64 flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
        <AdminHeader showAbsent={"Student Report"} />

        <main className="mt-16 p-6 container mx-auto">
          {/* Student Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-slate-800/50 rounded-2xl p-6 shadow-xl border border-slate-700">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-green-400 drop-shadow-lg">
                {student.name}
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Role: <span className="font-medium text-white">{student.role}</span>
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-300">📆 Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <SummaryCard title="🗓 Weekly Attendance" data={student.weekly} />
            <SummaryCard title="📅 Monthly Attendance" data={student.monthly} />
          </div>

          {/* Date Selector */}
          <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedMonth={selectedMonth} />

          {/* Day Records */}
          {selectedDate && dayRecords.length > 0 && (
            <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-700 p-6 mb-6">
              <h3 className="text-xl font-semibold mb-3 text-green-300">
                Punch Records for {selectedDate}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                    <tr>
                      <th className="p-3 text-left text-green-300">Punch In</th>
                      <th className="p-3 text-left text-green-300">Punch Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRecords.map((r, idx) => (
                      <tr
                        key={idx}
                        className={`
                          ${idx % 2 === 0 ? "bg-slate-800/40" : "bg-slate-900/40"} 
                          hover:bg-slate-700/60 transition
                        `}
                      >
                        <td className="p-3 text-slate-200">{r.punchIn || "—"}</td>
                        <td className="p-3 text-slate-200">{r.punchOut || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.print()}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition shadow-md"
                >
                  🖨 Print Records
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <ActionButtons fetchPrevAndCurrentWeek={fetchPrevAndCurrentWeek} fetchSelectedMonth={fetchSelectedMonth} />

          {/* Attendance Table */}
          {tableRecords.length > 0 && (
            <RecordsTable
              tableTitle={tableTitle}
              tableRecords={tableRecords}
              student={student}
            />
          )}

          {showNoDataModal && <NoDataModal onClose={closeNoDataModal} />}
        </main>
      </div>
    </div>
  );
}

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

  if (loading) return <p className="text-center p-6 text-gray-600">Loading student data...</p>;
  if (error) return <p className="text-center p-6 text-red-500">Error: {error}</p>;
  if (!student) return <p className="text-center p-6">No student found.</p>;

  return (
    <div className="flex">
      <AdminSidebar />

      <div className="ml-64 flex-1 flex flex-col min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-50">
        <AdminHeader showAbsent={"Student Report"} />

        <main className="mt-16 p-6 container mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Role: {student.role}</p>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-600">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border p-2 rounded-lg shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <SummaryCard title="Weekly Attendance" data={student.weekly} />
            <SummaryCard title="Monthly Attendance" data={student.monthly} />
          </div>

          <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} selectedMonth={selectedMonth} />

          {selectedDate && dayRecords.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">Punch Records for {selectedDate}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">Punch In</th>
                      <th className="p-3 text-left">Punch Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRecords.map((r, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="p-3">{r.punchIn || "—"}</td>
                        <td className="p-3">{r.punchOut || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-95">
                  Print Records
                </button>
              </div>
            </div>
          )}

          <ActionButtons fetchPrevAndCurrentWeek={fetchPrevAndCurrentWeek} fetchSelectedMonth={fetchSelectedMonth} />

          {tableRecords.length > 0 && (
            <RecordsTable tableTitle={tableTitle} tableRecords={tableRecords} student={student} />
          )}

          {showNoDataModal && <NoDataModal onClose={closeNoDataModal} />}
        </main>
      </div>
    </div>
  );
}

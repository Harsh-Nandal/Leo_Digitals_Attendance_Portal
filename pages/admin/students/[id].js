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

  // FETCH MONTH DATA
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

  // FETCH DAY DATA
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

      setTableTitle(`Attendance for ${data.prevWeekRange.start} → ${data.currentWeekRange.end}`);
      setTableRecords(data.records || []);
    } catch (err) {
      console.error(err);
      openNoDataModal();
    }
  };

  const fetchSelectedMonth = async () => {
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(
        `/api/admin/student/${id}?month=${selectedMonth}&allDays=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);
      const data = await res.json();

      if (!data.records || data.records.length === 0) openNoDataModal();

      setTableTitle(`Attendance for ${selectedMonth}`);
      setTableRecords(data.records || []);
    } catch (err) {
      console.error(err);
      openNoDataModal();
    }
  };

  // LOADING UI
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-purple-50 text-purple-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
      </div>
    );

  // ERROR UI
  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen bg-purple-50 text-red-500">
        <p>{error}</p>
      </div>
    );

  if (!student)
    return (
      <div className="flex justify-center items-center min-h-screen bg-purple-50 text-gray-700">
        <p>No student found.</p>
      </div>
    );

  return (
    <div className="flex min-h-screen text-gray-800 bg-gradient-to-br from-white via-purple-50 to-purple-100">

      <AdminSidebar />

      {/* MAIN UI */}
      <div className="ml-64 flex-1 flex flex-col">

        <AdminHeader showAbsent="Student Report" />

        <main className="mt-20 px-10 pb-10 w-full">

          {/* TOP STUDENT CARD */}
          <div className="
            bg-white/70 backdrop-blur-xl border border-purple-200
            rounded-2xl px-6 py-6 mb-8 shadow-lg
            flex flex-col md:flex-row justify-between items-start md:items-center gap-5
          ">
            <div>
              <h2 className="text-3xl font-extrabold text-purple-700">{student.name}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Role: <span className="text-gray-900 font-semibold">{student.role}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-gray-700 text-sm font-medium">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="
                  bg-white/70 border border-purple-300
                  rounded-lg px-3 py-2 text-gray-800 shadow-sm
                  focus:ring-2 focus:ring-purple-500 outline-none
                "
              />
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <SummaryCard title="Weekly Attendance" data={student.weekly} />
            <SummaryCard title="Monthly Attendance" data={student.monthly} />
          </div>

          {/* DATE SELECTOR */}
          <DateSelector
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedMonth={selectedMonth}
          />

          {/* DAILY RECORD UI */}
          {selectedDate && dayRecords.length > 0 && (
            <div className="
              bg-white/70 backdrop-blur-xl border border-purple-200
              rounded-2xl p-6 shadow-lg mb-8
            ">
              <h3 className="text-lg font-semibold text-purple-700 mb-4">
                Punch Records – {selectedDate}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700">
                  <thead className="bg-purple-100 text-purple-700">
                    <tr>
                      <th className="p-3 text-left">Punch In</th>
                      <th className="p-3 text-left">Punch Out</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dayRecords.map((r, i) => (
                      <tr
                        key={i}
                        className={`
                          ${i % 2 === 0 ? "bg-purple-50" : "bg-purple-100/40"}
                          hover:bg-purple-200 transition
                        `}
                      >
                        <td className="p-3">{r.punchIn || "—"}</td>
                        <td className="p-3">{r.punchOut || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => window.print()}
                className="
                  mt-4 bg-purple-600 hover:bg-purple-500
                  px-4 py-2 rounded-lg text-white shadow-md
                "
              >
                Print
              </button>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <ActionButtons
            fetchPrevAndCurrentWeek={fetchPrevAndCurrentWeek}
            fetchSelectedMonth={fetchSelectedMonth}
          />

          {/* MAIN TABLE */}
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

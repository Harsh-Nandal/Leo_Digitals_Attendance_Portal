"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";
import DashboardTabs from "../../components/DashboardTabs";
import AttendanceTable from "../../components/AttendanceTable";

export default function RecordsPage() {
  const [data, setData] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    absentDaily: [],
    absentWeekly: [],
    absentMonthly: [],
  });

  const [view, setView] = useState("daily");
  const [showAbsent, setShowAbsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.replace("/admin/login");
    else setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("adminToken");

        const res = await fetch("/api/admin/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authChecked]);

  const capitalizedView = view.charAt(0).toUpperCase() + view.slice(1);
  const attendanceList = showAbsent
    ? data[`absent${capitalizedView}`] ?? []
    : data[view] ?? [];

  if (!authChecked || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-white via-purple-50 to-white text-gray-800">
      
      {/* Sidebar */}
      <AdminSidebar setView={setView} setShowAbsent={setShowAbsent} />

      {/* Main Section */}
      <div className="ml-64 flex-1 flex flex-col bg-gradient-to-br from-white via-purple-50 to-white relative">
        
        {/* Header */}
        <AdminHeader showAbsent={"Records"} />

        {/* Main Container */}
        <main
          className="
            mt-16 p-8 
            min-h-screen 
            text-gray-800
            backdrop-blur-xl
          "
        >
          {/* Tabs */}
          <div
            className="
              mb-6 
              bg-white 
              border border-purple-200 
              rounded-xl 
              shadow-xl 
              p-4
            "
          >
            <DashboardTabs view={view} setView={setView} data={data} />
          </div>

          {/* Attendance Table */}
          <div
            className="
              bg-white 
              border border-purple-200 
              rounded-xl 
              shadow-xl
              p-6
            "
          >
            <AttendanceTable attendanceList={attendanceList} />
          </div>

        </main>
      </div>
    </div>
  );
}

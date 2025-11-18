"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../../components/AdminSidebar";
import AdminHeader from "../../../components/AdminHeader";

export default function TodayAbsents() {
  const [absents, setAbsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAbsents = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return router.replace("/admin/login");

      try {
        const res = await fetch("/api/admin/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAbsents(data.absentDaily || []);
      } catch (error) {
        console.error("Error fetching absents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAbsents();
  }, [router]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-red-500"></div>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <AdminSidebar />
      <div className="ml-64 flex-1 flex flex-col">
        <AdminHeader title="Today Absents" />
        <main className="p-8 mt-16">
          <h2 className="text-2xl font-semibold mb-6">
            Total Absents: {absents.length}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {absents.length > 0 ? (
              absents.map((user, idx) => (
                <div
                  key={idx}
                  className="border border-red-300 bg-red-50 rounded-xl p-4 text-center hover:shadow-md transition"
                >
                  <p className="text-xs text-gray-500">
                    REG NO - {user.regNo || user.userId || user.mobile || "----"}
                  </p>
                  <p className="font-semibold text-red-700 mt-1">
                    {user.name || "Unnamed"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-sm">No absents today.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

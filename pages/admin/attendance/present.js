"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../../components/AdminSidebar";
import AdminHeader from "../../../components/AdminHeader";

export default function TodayPresents() {
  const [presents, setPresents] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPresents = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return router.replace("/admin/login");

      try {
        const res = await fetch("/api/admin/attendance", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setPresents(data.daily || []);
      } catch (error) {
        console.error("Error fetching presents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPresents();
  }, [router]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-green-500"></div>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <AdminSidebar />
      <div className="ml-64 flex-1 flex flex-col">
        <AdminHeader title="Today Presents" />
        <main className="p-8 mt-16">
          <h2 className="text-2xl font-semibold mb-6">
            Total Presents: {presents.length}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {presents.length > 0 ? (
              presents.map((user, idx) => (
                <div
                  key={idx}
                  className="border border-green-300 bg-green-50 rounded-xl p-4 text-center hover:shadow-md transition"
                >
                  <p className="text-xs text-gray-500">
                    REG NO - {user.regNo || user.userId || user.mobile || "----"}
                  </p>
                  <p className="font-semibold text-green-700 mt-1">
                    {user.name || "Unnamed"}
                  </p>
                  <div className="mt-2 text-xs text-gray-600">
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
              <p className="text-gray-600 text-sm">No presents today.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

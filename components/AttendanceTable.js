"use client";
import Link from "next/link";

export default function AttendanceTable({ attendanceList }) {
  return (
    <div className="px-6 pb-6">
      <div className="rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-slate-700 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white uppercase tracking-wide">
              <tr>
                <th className="p-4 text-left font-semibold">Name</th>
                <th className="p-4 text-left font-semibold">Role</th>
                <th className="p-4 text-left font-semibold">Date</th>
                <th className="p-4 text-left font-semibold">Punch In</th>
                <th className="p-4 text-left font-semibold">Punch Out</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center p-6 text-gray-400 italic bg-slate-800/40"
                  >
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                attendanceList.map((entry, index) => {
                  const isAbsent = !entry.punchIn && !entry.punchOut;

                  return (
                    <tr
                      key={index}
                      className={`transition duration-200 border-b border-slate-700 ${
                        isAbsent
                          ? "bg-red-900/40 hover:bg-red-800/60"
                          : "bg-green-900/30 hover:bg-green-800/50"
                      }`}
                    >
                      {/* Name */}
                      <td className="p-4 font-medium">
                        <Link
                          href={`/admin/student/${entry.userId}`}
                          className={`hover:underline ${
                            isAbsent
                              ? "text-red-200 hover:text-red-100" // ✅ Fixed: Brighter red for better contrast
                              : "text-green-100 hover:text-green-50" // ✅ Fixed: Brighter green for better contrast
                          }`}
                        >
                          {entry.name || "Unknown"}
                        </Link>
                      </td>

                      {/* Role */}
                      <td className="p-4 text-gray-200"> {/* ✅ Fixed: Changed to text-gray-200 for better contrast */}
                        {entry.role || "-"}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-gray-200"> {/* ✅ Fixed: Changed to text-gray-200 for better contrast */}
                        {entry.date
                          ? new Date(entry.date).toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </td>

                      {/* Punch In / Out */}
                      {isAbsent ? (
                        <>
                          <td className="p-4 italic text-red-200">Absent</td> {/* ✅ Fixed: Changed to text-red-200 for better contrast */}
                          <td className="p-4 italic text-red-200">Absent</td> {/* ✅ Fixed: Changed to text-red-200 for better contrast */}
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-green-100 font-semibold"> {/* ✅ Fixed: Changed to text-green-100 for better contrast */}
                            {entry.punchIn || "-"}
                          </td>
                          <td className="p-4 text-green-100 font-semibold"> {/* ✅ Fixed: Changed to text-green-100 for better contrast */}
                            {entry.punchOut || "-"}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

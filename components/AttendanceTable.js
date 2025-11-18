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
                              ? "text-red-300 hover:text-red-200"
                              : "text-green-300 hover:text-green-200"
                          }`}
                        >
                          {entry.name || "Unknown"}
                        </Link>
                      </td>

                      {/* Role */}
                      <td className="p-4 text-slate-300">
                        {entry.role || "-"}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-300">
                        {entry.date
                          ? new Date(entry.date).toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </td>

                      {/* Punch In / Out */}
                      {isAbsent ? (
                        <>
                          <td className="p-4 italic text-red-300">Absent</td>
                          <td className="p-4 italic text-red-300">Absent</td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-green-200 font-semibold">
                            {entry.punchIn || "-"}
                          </td>
                          <td className="p-4 text-green-200 font-semibold">
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

"use client";

import React from "react";
import { downloadPDF, printTableHtml } from "../../utils/pdfUtils";

export default function RecordsTable({ tableTitle, tableRecords, student }) {
  return (
    <div className="bg-slate-900/60 rounded-2xl shadow-xl border border-slate-700 p-4 mb-6"> {/* ✅ Fixed: Changed to dark background */}
      <h3 className="text-lg font-semibold mb-3 text-green-300">{tableTitle}</h3> {/* ✅ Fixed: Changed to text-green-300 for themed accent */}

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-auto text-white"> {/* ✅ Fixed: Added text-white for visibility */}
          <thead className="bg-slate-800"> {/* ✅ Fixed: Changed to bg-slate-800 */}
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Punch In</th>
              <th className="p-3 text-left">Punch Out</th>
            </tr>
          </thead>
          <tbody>
            {tableRecords.map((r, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? "bg-slate-800/40" : "bg-slate-900/40"} // ✅ Fixed: Changed to dark alternating rows
              >
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.punchIn || "—"}</td>
                <td className="p-3">{r.punchOut || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => printTableHtml(tableTitle, tableRecords, student)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
        >
          Print Table
        </button>

        <button
          onClick={() => downloadPDF(tableTitle, tableRecords, student)}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

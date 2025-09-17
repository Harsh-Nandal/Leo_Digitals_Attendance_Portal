"use client";

import React from "react";
import { downloadPDF, printTableHtml } from "../../utils/pdfUtils";

export default function RecordsTable({ tableTitle, tableRecords, student }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{tableTitle}</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Punch In</th>
              <th className="p-3 text-left">Punch Out</th>
            </tr>
          </thead>
          <tbody>
            {tableRecords.map((r, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
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

"use client";

import React from "react";

export default function SummaryCard({ title, data }) {
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl shadow p-6 border overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">From {data.start} to {data.end}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Summary</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="p-3 rounded-lg bg-green-50 text-center">
          <div className="text-2xl font-bold text-green-700">{data.present}</div>
          <div className="text-xs text-gray-500">Present</div>
        </div>

        <div className="p-3 rounded-lg bg-red-50 text-center">
          <div className="text-2xl font-bold text-red-700">{data.absent}</div>
          <div className="text-xs text-gray-500">Absent</div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50 text-center">
          <div className="text-2xl font-bold text-blue-700">{data.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
    </div>
  );
}

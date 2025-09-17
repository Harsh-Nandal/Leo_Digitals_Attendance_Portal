"use client";

import React from "react";

export default function DateSelector({ selectedDate, setSelectedDate, selectedMonth }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <label className="text-gray-700 font-medium">Select Date:</label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="border rounded-lg p-2 shadow-sm"
        min={`${selectedMonth}-01`}
        max={`${selectedMonth}-31`}
      />
    </div>
  );
}

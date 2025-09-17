"use client";

import React from "react";

export default function ActionButtons({ fetchPrevAndCurrentWeek, fetchSelectedMonth }) {
  return (
    <div className="mb-8 flex flex-wrap gap-4">
      <button
        onClick={fetchPrevAndCurrentWeek}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow"
      >
        Show Current + Previous Week
      </button>

      <button
        onClick={fetchSelectedMonth}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow"
      >
        Show Selected Month
      </button>
    </div>
  );
}

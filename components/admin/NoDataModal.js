"use client";

import React from "react";

export default function NoDataModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Data Found</h2>
        <p className="text-sm text-gray-500 mb-4">There are no records available for this selection.</p>
        <button onClick={onClose} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
          OK
        </button>
      </div>
    </div>
  );
}

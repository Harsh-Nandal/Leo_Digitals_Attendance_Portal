"use client";
import { FaSignOutAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function AdminHeader({ showAbsent }) {
  const router = useRouter();

  return (
    <header
      className="
        fixed top-0 left-64 right-0 z-50
        bg-white
        h-16
        flex items-center justify-between
        px-8
        border-b border-gray-300
      "
    >
      {/* Page Title */}
      <h1 className="text-[20px] font-semibold text-gray-800 tracking-wide">
        {showAbsent ? showAbsent : "Dashboard"}
      </h1>

      {/* Logout Button */}
      <button
        onClick={() => {
          localStorage.removeItem("adminToken");
          router.replace("/admin/login");
        }}
        className="
          flex items-center gap-2 
          bg-red-500 hover:bg-red-600
          text-white
          px-4 py-2
          rounded-lg
          transition-all
          shadow-sm
        "
      >
        <FaSignOutAlt size={16} />
        Logout
      </button>
    </header>
  );
}

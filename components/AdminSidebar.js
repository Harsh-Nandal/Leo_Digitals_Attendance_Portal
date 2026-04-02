"use client";
import Link from "next/link";
import { FaTachometerAlt, FaUserTimes } from "react-icons/fa";
import { usePathname } from "next/navigation";

export default function AdminSidebar({ setView, setShowAbsent }) {
  const pathname = usePathname();

  const menu = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <FaTachometerAlt size={16} />,
    },
    {
      label: "Absentees",
      href: "/admin/attendance/absent",
      icon: <FaUserTimes size={16} />,
    },
    {
      label: "All Records",
      href: "/admin/records",
      icon: <FaUserTimes size={16} />,
    },
    {
      label: "Students",
      href: "/admin/students",
      icon: <FaUserTimes size={16} />,
    },
  ];

  return (
    <aside
      className="
        fixed top-0 left-0 h-screen 
        w-64 bg-white 
        text-gray-800 flex flex-col z-50
        border-r border-gray-200
      "
    >
      {/* Logo */}
      <div className="px-6 py-8 flex items-center justify-center border-b border-gray-200">
        <img
          src="/main_logo.png"
          alt="Logo"
          className="w-40 h-auto object-contain"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item, i) => {
          const active = pathname === item.href;

          return (
            <Link
              key={i}
              href={item.href}
              onClick={() => item.label === "Dashboard" && setShowAbsent(false)}
              className={`
                flex items-center gap-3 
                w-full px-4 py-3 rounded-lg text-sm font-medium
                transition-all select-none

                ${
                  active
                    ? "bg-[#5B2EFF] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button className="w-full py-2 text-gray-600 text-sm hover:text-gray-900">
          Logout
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";

export default function ManageStudents() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [deleteUserId, setDeleteUserId] = useState(null); // For delete popup
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const router = useRouter();

  // ✅ Check Admin Auth
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.replace("/admin/login");
    else setAuthChecked(true);
  }, [router]);

  // ✅ Fetch Users
  useEffect(() => {
    if (!authChecked) return;
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [authChecked]);

  // ✅ Open Delete Popup
  const openDeletePopup = (id) => {
    setDeleteUserId(id);
    setShowDeletePopup(true);
  };

  // ✅ Delete user
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/users/${deleteUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter((u) => u._id !== deleteUserId));
      setShowDeletePopup(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // ✅ Update user
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingUser.name,
          role: editingUser.role,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      setShowModal(false);
      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? editingUser : u))
      );
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-gray-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-100 text-red-700 p-6">
        <h2 className="text-xl font-bold mb-4">Error Loading Users</h2>
        <p>{error}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 flex-1 flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-x-hidden">
        <AdminHeader showAbsent={"Manage Students"} />

        <main className="mt-16 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">
            👥 Manage Students & Faculty
          </h2>

          {/* Search Bar */}
          <div className="flex justify-center mb-6">
            <input
              type="text"
              placeholder="🔍 Search by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md p-2 border rounded-lg text-white bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-800 text-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">User ID</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-700 hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3 capitalize">{user.role}</td>
                      <td className="px-4 py-3">{user.userId}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => openDeletePopup(user._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white transition"
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-6 text-gray-400 italic"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* ✅ Edit Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">✏️ Edit User</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-white bg-gray-900"
                placeholder="Full Name"
                required
              />
              <select
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, role: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-white bg-gray-900"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Beautiful Delete Popup */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl text-center animate-fadeIn w-full max-w-sm">
            <h3 className="text-xl font-bold mb-3 text-red-400">
              ⚠️ Confirm Deletion
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeletePopup(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

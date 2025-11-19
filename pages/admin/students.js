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

  const [deleteUserId, setDeleteUserId] = useState(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const router = useRouter();

  // AUTH CHECK
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) router.replace("/admin/login");
    else setAuthChecked(true);
  }, [router]);

  // FETCH USERS
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

  const openDeletePopup = (id) => {
    setDeleteUserId(id);
    setShowDeletePopup(true);
  };

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
      if (!res.ok) throw new Error("Failed to update");

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
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-purple-600"></div>
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
          className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR */}
      <AdminSidebar />

      {/* MAIN CONTENT */}
      <div className="ml-64 flex-1 bg-gray-50 min-h-screen">
        <AdminHeader showAbsent={"Manage Students"} />

        <main className="p-8 mt-10">
          

          {/* SEARCH BAR */}
          <div className="mb-6 flex justify-start mt-5">
            <input
              type="text"
              placeholder="Search by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xxl px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto bg-white shadow-md rounded-xl border">
            <table className="w-full text-left text-gray-700">
              <thead className="bg-gray-100 text-gray-600 text-sm">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3 capitalize">{user.role}</td>
                      <td className="px-4 py-3">{user.userId}</td>

                      {/* ACTION BUTTONS */}
                      <td className="px-4 py-3 text-center flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowModal(true);
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeletePopup(user._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-6 text-gray-500 italic"
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

      {/* EDIT MODAL */}
      {showModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Edit User
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, name: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                required
              />

              <select
                value={editingUser.role}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, role: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg bg-gray-50"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE POPUP */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-3">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeletePopup(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

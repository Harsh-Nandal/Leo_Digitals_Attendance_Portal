import connectDB from "../../../../lib/mongodb"
import User from "../../../../models/User";

export default async function handler(req, res) {
  await connectDB();
  const { id } = req.query;

  if (req.method === "DELETE") {
    await User.findByIdAndDelete(id);
    return res.json({ message: "User deleted" });
  }

  if (req.method === "PUT") {
    const { name, role } = req.body;
    const updated = await User.findByIdAndUpdate(
      id,
      { name, role },
      { new: true }
    );
    return res.json({ message: "User updated", user: updated });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

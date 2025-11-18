// GET: fetch all users
// POST: create new (optional)
import connectDB from "../../../lib/mongodb"
import User from "../../../models/User";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const users = await User.find({});
    return res.json({ users });
  }

  return res.status(405).json({ message: "Method not allowed" });
}

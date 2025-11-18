import connectDB from "../../lib/mongodb";
import Student from "../../models/User";

export default async function handler(req, res) {
  await connectDB();

  const students = await Student.find().select("name userId _id");

  res.status(200).json({ students });
}

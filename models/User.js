// models/User.js
import mongoose from "mongoose";

const RekognitionSchema = new mongoose.Schema({
  externalImageId: { type: String }, // maps to your userId
  faceIds: { type: [String], default: [] }, // Rekognition FaceIds
  lastIndexedAt: { type: Date },
  indexResponse: { type: mongoose.Schema.Types.Mixed },
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  role: { type: String, enum: ["student", "faculty"], required: true },
  imageUrl: { type: String, required: true }, // face image
  fingerprintData: { type: String, required: true }, // base64 image or scanner data
  rekognition: { type: RekognitionSchema, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);

// pages/api/register.js
import connectDB from "../../lib/mongodb";
import User from "../../models/User";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import sharp from "sharp";
import {
  RekognitionClient,
  IndexFacesCommand,
} from "@aws-sdk/client-rekognition";

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Rekognition Config ---
const REGION = process.env.AWS_REGION || "ap-south-1";
const REK_COLLECTION =
  process.env.REKOGNITION_COLLECTION || "students-collection";
const rekClient = new RekognitionClient({ region: REGION });

// ---------- HELPER: Get clarity score ----------
async function getClarityScore(imageBuffer) {
  const { data } = await sharp(imageBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  let sum = 0, sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    sumSq += data[i] * data[i];
  }
  const mean = sum / data.length;
  const variance = sumSq / data.length - mean * mean;
  return variance;
}

// ---------- HELPER: Pick clearest image ----------
async function pickClearestImage(imageArray) {
  const results = [];

  for (const img of imageArray) {
    try {
      const buffer = Buffer.from(img.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const clarity = await getClarityScore(buffer);
      results.push({ clarity, imageData: img });
    } catch (err) {
      console.warn("❌ Image clarity check failed:", err.message);
    }
  }

  if (!results.length) throw new Error("No valid images received.");

  results.sort((a, b) => b.clarity - a.clarity);
  const best = results[0];
  console.log(`📸 Clearest image clarity: ${best.clarity}`);
  return best.imageData;
}

// ---------- HELPER: Index face with retries ----------
async function indexFaceWithRetries(buffer, userId, maxAttempts = 3) {
  let attempt = 0, lastErr = null;
  while (attempt < maxAttempts) {
    try {
      const cmd = new IndexFacesCommand({
        CollectionId: REK_COLLECTION,
        Image: { Bytes: buffer },
        ExternalImageId: String(userId),
        DetectionAttributes: [],
        MaxFaces: 1,
      });
      const out = await rekClient.send(cmd);
      return { success: true, out };
    } catch (err) {
      lastErr = err;
      attempt++;
      console.warn(`⚠️ Rekognition attempt ${attempt} failed:`, err.message);
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  return { success: false, error: lastErr };
}

// ---------- API Handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ message: "Invalid request body format." });
    }
  }

  const { name, userId, role, imageData } = body;

  if (
    !name ||
    !userId ||
    !role ||
    (!Array.isArray(imageData) && typeof imageData !== "string")
  )
    return res.status(400).json({ message: "Missing or invalid fields." });

  try {
    await connectDB();

    const existing = await User.findOne({ userId });
    if (existing)
      return res.status(409).json({ message: "User ID already exists." });

    // 🔥 Pick clearest image if multiple were captured
    const selectedImage = Array.isArray(imageData)
      ? await pickClearestImage(imageData)
      : imageData;

    // Upload all captured images to Cloudinary (for record)
    const uploadAll = await Promise.allSettled(
      (Array.isArray(imageData) ? imageData : [imageData]).map(img =>
        cloudinary.uploader.upload(img, { folder: "mdci-faces/raw" })
      )
    );

    const allUploadedUrls = uploadAll
      .filter(u => u.status === "fulfilled")
      .map(u => u.value.secure_url);

    // Upload clearest image in main folder
    const mainUpload = await cloudinary.uploader.upload(selectedImage, {
      folder: "mdci-faces/main",
    });

    const imageUrl = mainUpload.secure_url;

    console.log("✅ Cloudinary uploads complete:", {
      main: imageUrl,
      total: allUploadedUrls.length,
    });

    // Save to DB
    const newUser = await User.create({
      name,
      userId,
      role,
      imageUrl,
      allImages: allUploadedUrls,
    });

    // Download for Rekognition
    const resp = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(resp.data);

    const rekResult = await indexFaceWithRetries(buffer, userId, 3);

    if (!rekResult.success) {
      console.warn("⚠️ Rekognition failed:", rekResult.error?.message);
      return res.status(200).json({
        message: "User created but Rekognition indexing failed.",
        user: newUser,
      });
    }

    const out = rekResult.out;
    const faceIds =
      out?.FaceRecords?.map(r => r.Face?.FaceId).filter(Boolean) || [];

    await User.updateOne(
      { _id: newUser._id },
      {
        $set: {
          "rekognition.faceIds": faceIds,
          "rekognition.lastIndexedAt": new Date(),
        },
      }
    );

    const updatedUser = await User.findById(newUser._id).lean();
    console.log(`✅ Indexed face for ${userId} (${faceIds.length} face(s))`);

    return res.status(200).json({
      message: "User registered successfully.",
      user: updatedUser,
      rekognition: { faceIds },
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
}

// --- Increased body limit for image arrays ---
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

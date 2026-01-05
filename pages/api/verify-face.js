// pages/api/verify-face.js
import connectDB from "../../lib/mongodb";
import User from "../../models/User";
import axios from "axios";
import { RekognitionClient, SearchFacesByImageCommand } from "@aws-sdk/client-rekognition";

// ----------------- Configuration / ENV -----------------
const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 0.45); // Tighter for accuracy
const REGION = process.env.AWS_REGION || "ap-south-1";
const REK_COLLECTION = process.env.REKOGNITION_COLLECTION || process.env.REKOG_COLLECTION || "students-collection";
const REKOGNITION_SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD ?? 80); // Increased for stricter matching
const REKOGNITION_MAX_FACES = Number(process.env.REKOG_MAX_FACES ?? 3);
const REKOG_CONCURRENCY = Math.max(1, Number(process.env.REKOG_CONCURRENCY ?? 4));

// Simple in-memory cache for speed (resets on server restart)
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// AWS Rekognition client (server-side)
const rekClient = new RekognitionClient({ region: REGION });

// ----------------- helper math functions (optimized) -----------------
function l2Normalize(arr) {
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) sumSq += arr[i] * arr[i];
  const norm = Math.sqrt(sumSq) || 1;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] / norm; 
  return out;
}

function euclideanDistance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function bestDistanceToUser(queryDesc, user) {
  const pool = Array.isArray(user.faceDescriptors) && user.faceDescriptors.length
    ? user.faceDescriptors
    : user.faceDescriptor
    ? [user.faceDescriptor]
    : [];
  if (pool.length === 0) return Infinity; // Skip users without descriptors for speed

  let best = Infinity;
  for (const d of pool) {
    if (!Array.isArray(d) || d.length !== queryDesc.length) continue;
    const dist = euclideanDistance(queryDesc, l2Normalize(d));
    if (dist < best) best = dist;
  }
  return best;
}

// ----------------- Rekognition helpers -----------------
async function getImageBuffer({ imageData, imageUrl }) {
  if (imageData) {
    const m = imageData.match(/^data:.+;base64,(.*)$/);
    if (!m) throw new Error("Invalid imageData (expected dataURL)");
    return Buffer.from(m[1], "base64");
  }
  if (imageUrl) {
    const resp = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 5000 }); // Shorter timeout
    return Buffer.from(resp.data);
  }
  throw new Error("No imageData or imageUrl provided");
}

async function rekognitionSearch(buffer) {
  const cmd = new SearchFacesByImageCommand({
    CollectionId: REK_COLLECTION,
    Image: { Bytes: buffer },
    FaceMatchThreshold: REKOGNITION_SIMILARITY_THRESHOLD,
    MaxFaces: REKOGNITION_MAX_FACES,
  });
  const out = await rekClient.send(cmd);
  const matches = out.FaceMatches || [];
  if (!matches.length) return { found: false, raw: out };
  return { found: true, topMatch: matches[0], raw: out };
}

// ----------------- API handler -----------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { imageData, imageUrl, descriptor } = req.body;

    // If image provided, prefer Rekognition flow
    if (imageData || imageUrl) {
      let buffer;
      try {
        buffer = await getImageBuffer({ imageData, imageUrl });
      } catch (err) {
        console.error("Image buffer error:", err);
        return res.status(400).json({ message: "Invalid imageData or imageUrl", error: err.message });
      }

      await connectDB();

      let rk;
      try {
        rk = await rekognitionSearch(buffer);
      } catch (rkErr) {
        console.error("Rekognition error:", rkErr);
        if (!descriptor) {
          return res.status(500).json({ message: "Rekognition error", error: rkErr.message });
        }
      }

      if (rk && rk.found) {
        const top = rk.topMatch;
        const similarity = typeof top.Similarity === "number" ? top.Similarity : null;
        const rekFace = top.Face || {};

        let user = null;
        if (rekFace.ExternalImageId) {
          user = await User.findOne({ "rekognition.externalImageId": rekFace.ExternalImageId }).lean();
        }
        if (!user && rekFace.FaceId) {
          user = await User.findOne({ "rekognition.faceIds": rekFace.FaceId }).lean();
        }

        if (!user) {
          return res.status(200).json({
            success: false,
            message: "Face matched in Rekognition but no local user mapping found",
            rawMatch: top,
            similarity,
          });
        }

        const matchDistance = similarity === null ? null : Number((1 - similarity / 100).toFixed(4));
        const confidence = similarity === null
          ? null
          : Number(((similarity - REKOGNITION_SIMILARITY_THRESHOLD) / (100 - REKOGNITION_SIMILARITY_THRESHOLD)).toFixed(3));

        return res.status(200).json({
          success: true,
          distance: matchDistance,
          similarity,
          confidence,
          user: {
            name: user.name,
            role: user.role || "student",
            userId: String(user.userId ?? user._id),
            imageUrl: user.imageUrl || null,
          },
          rawMatch: top,
        });
      }

      return res.status(200).json({ success: false, message: "No Rekognition match", raw: rk ? rk.raw : null });
    }

    // ---------------- FALLBACK: descriptor-based matching ----------------
    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ message: "Provide imageData/imageUrl OR descriptor" });
    }

    if (descriptor.length < 64) {
      return res.status(400).json({ message: "Descriptor too short" });
    }

    const query = l2Normalize(descriptor);
    await connectDB();

    // Check cache first for speed
    const cacheKey = `users_${Date.now()}`;
    let users = userCache.get(cacheKey);
    if (!users || (Date.now() - userCache.get(`${cacheKey}_time`)) > CACHE_TTL) {
      users = await User.find({}, "name role userId imageUrl faceDescriptor faceDescriptors").lean();
      userCache.set(cacheKey, users);
      userCache.set(`${cacheKey}_time`, Date.now());
    }

    let globalBest = { user: null, distance: Infinity };

    for (const user of users) {
      const dist = bestDistanceToUser(query, user);
      if (Number.isFinite(dist) && dist < globalBest.distance) {
        globalBest = { user, distance: dist };
      }
    }

    if (globalBest.user && globalBest.distance < MATCH_THRESHOLD) {
      const confidence = Math.max(0, Math.min(1, 1 - globalBest.distance / MATCH_THRESHOLD));

      return res.status(200).json({
        success: true,
        distance: Number(globalBest.distance.toFixed(4)),
        confidence: Number(confidence.toFixed(3)),
        user: {
          name: globalBest.user.name,
          role: globalBest.user.role,
          userId: String(globalBest.user.userId ?? globalBest.user._id),
          imageUrl: globalBest.user.imageUrl || null,
        },
      });
    }

    return res.status(200).json({
      success: false,
      distance: Number.isFinite(globalBest.distance) ? Number(globalBest.distance.toFixed(4)) : null,
    });
  } catch (error) {
    console.error("Face verification error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
}

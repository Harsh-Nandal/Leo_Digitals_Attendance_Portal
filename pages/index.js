"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as faceapi from "face-api.js";

// 

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState(""); // New state for dynamic popup message
  const [loading, setLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const runningDetection = useRef(false);
  const router = useRouter();

  const handleClose = () => {
    setShowPopup(false);
    setPopupMessage(""); // Reset message on close
  };

  // Ask camera permission
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (stream) stream.getTracks().forEach((t) => t.stop());
        console.log("✅ Camera permission granted");
      } catch (err) {
        alert("Please allow camera access to mark attendance.");
      }
    })();
  }, []);

  // Start camera
  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current.play();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Could not access camera.");
      }
    })();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture single frame
  const captureImage = () => {
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // Capture multiple frames and pick best one (middle) - improved for accuracy
  const captureBestFrame = async (count = 10, delay = 100) => {
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(captureImage());
      await new Promise((r) => setTimeout(r, delay));
    }
    // pick middle frame for stability
    return frames[Math.floor(frames.length / 2)];
  };

  // Load face detection model
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models"); // Adjust path to your models folder (e.g., public/models)
        console.log("✅ Face detection model loaded");
      } catch (err) {
        console.error("❌ Failed to load face detection model:", err);
      }
    };
    loadModels();
  }, []);

  // Attendance handler
  const handleAttendance = async () => {
    if (runningDetection.current) return;
    runningDetection.current = true;
    setLoading(true);

    try {
      if (!videoReady) {
        alert("Camera not ready yet. Please wait a second.");
        return;
      }

      console.log("📸 Capturing best frame...");
      let imageData = await captureBestFrame();
      let faceDetected = false;
      let retryCount = 0;
      const maxRetries = 3;

      // Quick client-side face detection to ensure accuracy
      while (!faceDetected && retryCount < maxRetries) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        if (detections.length > 0) {
          faceDetected = true;
        } else {
          console.warn(
            `No face detected, retrying... (${retryCount + 1}/${maxRetries})`
          );
          await new Promise((r) => setTimeout(r, 500)); // Short delay before retry
          imageData = await captureBestFrame(); // Recapture
          retryCount++;
        }
      }

      if (!faceDetected) {
        // Show popup with message for no face detected
        setPopupMessage("No face detected. Please position yourself better and try again.");
        setShowPopup(true);
        return;
      }

      console.log("📤 Sending image for verification...");
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
        signal: AbortSignal.timeout(10000), // 10s timeout for speed
      });

      const result = await res.json();
      console.log("💻 Result:", result);

      const distance =
        typeof result?.distance === "number"
          ? result.distance
        : typeof result?.matchDistance === "number"
          ? result.matchDistance
          : null;

      const distanceOk = distance === null ? true : distance < 0.55; // Stricter check for accuracy

      if (result.success && result.user && distanceOk) {
        const { name, role, userId, imageUrl } = result.user;
        localStorage.setItem("uid", userId);

        // Optional Telegram alert
        fetch("/api/send-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, userId, imageData }),
        }).catch(() => {});

        router.push(
          `/success?name=${encodeURIComponent(name)}&role=${encodeURIComponent(
            role
          )}&userId=${encodeURIComponent(userId)}&image=${encodeURIComponent(
            imageUrl || ""
          )}&imageData=${encodeURIComponent(imageData)}`
        );
      } else {
        console.warn("Not recognized:", result);
        setPopupMessage("Not recognized with high confidence. Please choose an option:");
        setShowPopup(true);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Something went wrong during attendance.");
    } finally {
      setLoading(false);
      runningDetection.current = false;
    }
  };

  // PWA install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          setIsInstalled(true);
        }
      });
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200 p-6 text-center relative">
      {/* Popup - Shows for both no face detected and not recognized, with buttons always visible */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl p-7 rounded-3xl shadow-2xl w-80 relative border border-gray-200 animate-slideUp">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500 transition text-xl"
            >
              ✕
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Welcome!
            </h2>

            {/* Dynamic Message */}
            <p className="text-gray-600 text-center leading-relaxed mb-6">
              {popupMessage}
            </p>

            {/* Buttons - Always visible in the popup */}
            <div className="flex gap-3">
              <Link href="/newStudent" className="flex-1">
                <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm">
                  New User
                </button>
              </Link>

              <Link href="/punchPage" className="flex-1">
                <button className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition shadow-sm">
                  Registered
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <img
        src="/main_logo.png"
        alt="Logo"
        className="w-100 h-auto mb-4 drop-shadow-lg"
      />

      {/* Camera */}
      <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg mb-4 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-full"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
            <span className="text-white font-semibold">Detecting...</span>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6 leading-snug">
        Welcome <br /> to <br /> Leo Digitalz 
      </h2>

      <button
        onClick={handleAttendance}
        disabled={loading || !videoReady}
        className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg shadow hover:bg-green-700 transition disabled:bg-green-400 mb-4"
      >
        {loading ? "Detecting..." : "Mark Your Daily Attendance"}
      </button>

      {!isInstalled && installPrompt && (
        <button
          onClick={handleInstall}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Install App
        </button>
      )}
    </main>
  );
}
